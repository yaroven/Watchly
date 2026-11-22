#!/usr/bin/env bash
set -euo pipefail

: "${KUBECONFIG:?set KUBECONFIG to the cluster admin kubeconfig, e.g. ~/.kube/watchly-oke}"

cd "$(dirname "$0")/.."

LB_NSG_ID="$(terraform -chdir=terraform output -raw lb_nsg_id)"

helm repo add external-secrets https://charts.external-secrets.io --force-update >/dev/null
helm repo add jetstack https://charts.jetstack.io --force-update >/dev/null
helm repo add traefik https://traefik.github.io/charts --force-update >/dev/null

helm upgrade --install external-secrets external-secrets/external-secrets \
  --version 2.15.0 \
  --namespace external-secrets --create-namespace \
  --wait --timeout 10m

helm upgrade --install cert-manager jetstack/cert-manager \
  --version v1.21.3 \
  --namespace cert-manager --create-namespace \
  --set crds.enabled=true \
  --wait --timeout 10m

helm upgrade --install traefik traefik/traefik \
  --version 42.4.1 \
  --namespace traefik --create-namespace \
  --values k8s/cluster/traefik-values.yaml \
  --set-string "service.annotations.oci-network-load-balancer\.oraclecloud\.com/oci-network-security-groups=$LB_NSG_ID" \
  --wait --timeout 15m

kubectl apply -f k8s/cluster/ci-rbac.yaml -f k8s/cluster/oci-vault-store.yaml -f k8s/cluster/cluster-issuer.yaml

kubectl -n traefik get service traefik \
  -o jsonpath='{"Load balancer IPs: "}{.status.loadBalancer.ingress[*].ip}{"\n"}'
