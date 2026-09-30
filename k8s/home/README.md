# Home cluster deploy

The manifests in this directory run Watchly on a single-node k3s box on the
LAN: the app plus its own Postgres, Redis and MinIO, behind the Traefik
controller k3s ships with. No managed services, no TLS, not reachable from
the internet.

**The operating manual lives in Linear:**
https://linear.app/yaroven-watchly/document/home-cluster-deploy-cfa3913cf839

It covers why each managed service became a pod, what swapping S3 for MinIO
cost and how the app works around it, first-time setup, deploying a new
version, and the failures the first deploy hit with what each one meant.

Quick reference:

| | |
|---|---|
| Namespace | `watchly-home` |
| App | http://watchly.192-168-31-100.sslip.io |
| API | http://api.watchly.192-168-31-100.sslip.io |
| S3 | http://s3.watchly.192-168-31-100.sslip.io |

```bash
kubectl apply -k k8s/home             # deploy
kubectl apply -k k8s/home/migration   # schema, before the app rolls out
kubectl -n watchly-home get pods
```

Changing these manifests? Update the Linear page in the same breath — a
runbook that lies is worse than none.
