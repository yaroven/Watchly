NAMESPACE ?= watchly-home

.PHONY: help
help:
	@echo "Home cluster:"
	@echo "  make release-home            build and push images for the home cluster from the current branch"
	@echo "  make deploy-home SHA=<sha>   point the overlay at that build and roll it out"
	@echo "  make migrate-home SHA=<sha>  run the migration Job at that build"
	@echo "  make status-home             pods, ingress and volumes"

# Runs the build on GitHub rather than locally: the runners are amd64 like
# the cluster, and an Apple-silicon laptop only reaches that through
# emulation. Prints nothing useful itself — watch the run, then take the sha
# it reports as `Publishing <sha>`.
.PHONY: release-home
release-home:
	gh workflow run "Release Images" --ref "$$(git rev-parse --abbrev-ref HEAD)" -f client_env=home
	@echo "watch it with: gh run watch \$$(gh run list --workflow='Release Images' --limit 1 --json databaseId --jq '.[0].databaseId')"

.PHONY: deploy-home
deploy-home:
	@test -n "$(SHA)" || { echo "usage: make deploy-home SHA=<sha>"; exit 1; }
	@scripts/set-home-images.sh "$(SHA)"
	kubectl apply -k k8s/home
	kubectl -n $(NAMESPACE) rollout status deploy/api --timeout=5m

# Separate from deploy-home on purpose: schema changes go out before the code
# that needs them. The Job's pod template is immutable, so a previous run has
# to go before this one can be created.
.PHONY: migrate-home
migrate-home:
	@test -n "$(SHA)" || { echo "usage: make migrate-home SHA=<sha>"; exit 1; }
	@scripts/set-home-images.sh "$(SHA)"
	kubectl -n $(NAMESPACE) delete job watchly-migrate --ignore-not-found
	kubectl apply -k k8s/home/migration
	kubectl wait --for=condition=complete job/watchly-migrate -n $(NAMESPACE) --timeout=10m

.PHONY: status-home
status-home:
	@kubectl -n $(NAMESPACE) get pods
	@echo
	@kubectl -n $(NAMESPACE) get ingress,pvc
