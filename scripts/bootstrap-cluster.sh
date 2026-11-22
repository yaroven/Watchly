#!/usr/bin/env bash
set -euo pipefail

: "${KUBECONFIG:?set KUBECONFIG to the cluster admin kubeconfig, e.g. ~/.kube/watchly-oke}"

cd "$(dirname "$0")/.."

helm repo add external-secrets https://charts.external-secrets.io --force-update >/dev/null
helm upgrade --install external-secrets external-secrets/external-secrets \
  --version 2.15.0 \
  --namespace external-secrets --create-namespace \
  --wait --timeout 10m

kubectl apply -f k8s/cluster/ci-rbac.yaml -f k8s/cluster/oci-vault-store.yaml
