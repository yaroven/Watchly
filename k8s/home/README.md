# Home cluster deploy

Running Watchly on a single-node k3s box on the LAN, with no managed
services behind it. This is the overlay's operating manual: what is here,
why it is shaped this way, and how to run it day to day.

The short version: `k8s/base` describes the app, `k8s/prod` points it at
DigitalOcean and AWS, and this overlay replaces all of that with containers
in the same namespace.

---

## 1. What is running

```
                    ┌──────────── k3s node: home-server (192.168.31.100) ────────────┐
                    │                                                                 │
  browser ──80──▶ Traefik ──▶ client:4000 ──▶ api:3000 ──┬──▶ postgres:5432          │
   (LAN)            │                                     ├──▶ redis:6379            │
                    ├──▶ api:3000                         └──▶ minio:9000            │
                    └──▶ minio:9000                                                   │
                                                          transcoder-worker ──▶ redis  │
                                                                             └─▶ minio │
                    │  grafana ◀── loki ◀── (app logs)   [not exposed, port-forward]   │
                    └─────────────────────────────────────────────────────────────────┘
```

| Component | Image | Why it is here |
|---|---|---|
| api | `razanka/watchly-api` | The NestJS backend |
| client | `razanka/watchly-client` | Next.js frontend |
| transcoder-worker | `razanka/watchly-transcoder-worker` | ffmpeg jobs off the BullMQ queue |
| postgres | `postgres:16` | Replaces DigitalOcean Managed Postgres |
| redis | `redis:8.4.0` | Replaces DigitalOcean Managed Redis; holds the queue |
| minio | `chainguard/minio:latest` | Replaces AWS S3 |
| loki + grafana | upstream | Log aggregation, same as every other environment |

Hostnames, all through the Traefik controller k3s ships with:

| URL | Goes to |
|---|---|
| `http://watchly.192-168-31-100.sslip.io` | client |
| `http://api.watchly.192-168-31-100.sslip.io` | api |
| `http://s3.watchly.192-168-31-100.sslip.io` | MinIO S3 API |

---

## 2. The decisions, and why

### Everything in-cluster

The prod overlay assumes managed Postgres, managed Redis, real S3 and a real
SQS queue. None of those exist on a home server, and paying for them to run a
home instance defeats the point. So each one is a pod with a `local-path`
volume. The trade is that backups are now your problem — see §7.

### sslip.io hostnames instead of a hosts file

`watchly.192-168-31-100.sslip.io` resolves to `192.168.31.100` because
sslip.io answers any `<ip>.sslip.io` with that IP. Nothing has to be
configured on any device, which matters when the phone and the TV also need
to reach it.

The catch: routers with DNS-rebind protection (Pi-hole, OpenWRT, some ISP
boxes) refuse DNS answers that point into private ranges, and these names
will not resolve there. If that happens, add the names to the router's local
DNS instead and change `ingress.yaml`.

### No TLS

The cluster is not reachable from the internet, so Let's Encrypt has nothing
to validate against and cert-manager is not installed. That is also why
`ingress.yaml` has no `tls:` block and the URLs are `http://`.

### Traefik, not ingress-nginx

`k8s/dev` and `k8s/prod` use `ingressClassName: nginx` because DOKS has no
ingress controller preinstalled and they install one. k3s ships Traefik as
the default, so this overlay targets that instead of installing a second
controller.

### MinIO, and what it cost

MinIO speaks the S3 API and the same path-style URLs the client's image
proxy matches, so the api needed no changes to talk to it. Two things did not
survive the swap:

1. **No bucket notifications into SQS.** MinIO rejects an AWS queue ARN on
   `PutBucketNotificationConfiguration`. That call was how uploads became
   transcode jobs — S3 fired an event, SQS queued it, the api polled it. The
   overlay sets `S3_EVENTS_ENABLED=false`, and `MediaAssetService.completeUpload`
   now schedules the job itself. The queue job id is derived from
   `(type, id)`, so where the event path *is* live (dev, prod) both paths
   dedupe into one job rather than transcoding twice.
2. **No per-bucket CORS API.** MinIO answers `501 NotImplemented` to
   `PutBucketCors` and allows every origin by default. `S3Service` used to
   call it unconditionally at boot, which killed api and worker on startup.
   It now catches that one error and logs a warning; any other CORS failure
   is still fatal.

### The MinIO image comes from Chainguard

MinIO stopped serving anonymous pulls of its own images — Docker Hub and
quay alike answer 401, even for `latest`. The node cannot fetch them without
a registry credential. Chainguard publishes a free public build of the same
server, so that is what runs here. Its free tier only offers the `latest`
tag, which means the image can move under you on a pod restart; pin it by
mirroring into your own registry if that ever matters.

For the same reason bucket setup uses `amazon/aws-cli` rather than `mc`.

### The content bucket is world-readable

The api hands out a presigned URL for `master.m3u8`, but the segments that
playlist references are fetched by their own plain URLs. Presigning each one
is not possible, and a playlist-long expiry would break mid-film. The
`minio-buckets` Job therefore applies a public `s3:GetObject` policy to the
processed bucket. On a LAN-only cluster that is acceptable; it would not be
on a public one.

### Storage class overrides

`k8s/base` pins `do-block-storage` on the Loki and Grafana volumes. That
class only exists on DigitalOcean, so both pods sat `Pending` forever here.
`storage-class-patch.yaml` rewrites them to `local-path`, which is what k3s
provides by default.

### The client image is built per environment

`NEXT_PUBLIC_*` values are compiled into the browser bundle, so one image
cannot serve two clusters. The CI workflow builds the client against a
GitHub Environment's variables and puts that environment's name in the tag
(`home-<sha>`), which makes pulling the wrong one impossible by accident.

---

## 3. Files

| File | What it does |
|---|---|
| `kustomization.yaml` | Ties it together: namespace, image tags, config overrides, secret |
| `namespace.yaml` | `watchly-home` |
| `postgres.yaml` | Postgres + 10Gi PVC. `Recreate` strategy — an RWO volume cannot be shared by two pods during a rolling update |
| `redis.yaml` | Redis with `appendonly` + 2Gi PVC. Losing it loses queued transcodes |
| `minio.yaml` | MinIO + 100Gi PVC, plus the Job that creates the buckets and sets the public read policy |
| `storage-class-patch.yaml` | Rewrites the Loki/Grafana volumes onto `local-path` |
| `ingress.yaml` | The three hostnames above, on Traefik |
| `migration/kustomization.yaml` | The shared migration Job with this namespace and image tag |
| `.env.example` | Template for `.env.secrets` (gitignored) |

### Config values that differ from base

```
REDIS_PORT=6379              REDIS_TLS=false          # base assumes managed Redis on a TLS port
S3_ENDPOINT_INTERNAL=http://minio:9000                # what the api calls
S3_ENDPOINT_PUBLIC=http://s3.watchly.192-168-31-100.sslip.io   # what the browser calls
S3_RAW_BUCKET_NAME=raw       S3_PROCESSED_BUCKET_NAME=content
S3_EVENTS_ENABLED=false                               # see §2
JWT_EXPIRES_IN=1h            JWT_REFRESH_EXPIRES_IN=30d
CORS_ALLOWED_ORIGINS=http://watchly.192-168-31-100.sslip.io
```

### Secrets (`k8s/home/.env.secrets`, gitignored)

`DATABASE_URL`, `POSTGRES_PASSWORD`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
`REDIS_HOST`, `REDIS_PASSWORD`, `GRAFANA_ADMIN_PASSWORD`, `JWT_SECRET`,
`JWT_REFRESH_SECRET`, `OMDB_API_KEY`.

All of them are required: `requireInProduction` hard-fails the api on the
first one it cannot find, rather than silently falling back to a development
default. `POSTGRES_PASSWORD` and the password inside `DATABASE_URL` are the
same value written twice — Prisma wants a URL, the Postgres image wants a
variable. Changing either after the volume exists does nothing; the image
only reads it when initialising an empty data directory.

---

## 4. First-time setup

**1. Cluster access.** On the server, `sudo cat /etc/rancher/k3s/k3s.yaml`;
on the laptop, save it as `~/.kube/config` and replace `127.0.0.1` with the
server's LAN address. The k3s serving certificate covers the node's LAN IP
but not its Tailscale one — to reach the API server over Tailscale, add
`--tls-san <tailscale-ip>` to the k3s service and restart it.

**2. Secrets.**

```bash
cp k8s/home/.env.example k8s/home/.env.secrets   # fill in
cp k8s/home/.env.example k8s/base/.env.secrets   # kustomize needs the file to exist
```

The second copy is a kustomize quirk: the base generator is evaluated before
this overlay replaces it, so the file it points at must exist. Its contents
are irrelevant here.

**3. Images.** Actions → *Release Images* → Run workflow, on the branch you
want, with `client_env: home`. Runners are amd64 like the node — building on
an Apple-silicon laptop would need emulation. The run prints
`Publishing <sha>`.

**4. Tags.** Put that sha in `k8s/home/kustomization.yaml` (api, worker, and
`home-<sha>` for the client) and in `k8s/home/migration/kustomization.yaml`
(migrator).

**5. Apply.**

```bash
kubectl apply -k k8s/home
kubectl -n watchly-home get pods -w      # wait for postgres/redis/minio
kubectl apply -k k8s/home/migration
kubectl wait --for=condition=complete job/watchly-migrate -n watchly-home --timeout=10m
```

**6. Check.**

```bash
curl http://api.watchly.192-168-31-100.sslip.io/health      # 200
curl http://api.watchly.192-168-31-100.sslip.io/title       # {"items":[],...}
open http://watchly.192-168-31-100.sslip.io
```

---

## 5. Deploying a new version

1. Run *Release Images* on the branch, `client_env: home`.
2. Bump the four tags (§4 step 4).
3. `kubectl apply -k k8s/home`
4. If the release contains a migration: `kubectl apply -k k8s/home/migration`
   first, then apply the app. The Job is immutable once created — delete the
   old one (`kubectl -n watchly-home delete job watchly-migrate`) before
   re-applying.

Changing a value in `.env.secrets` does **not** restart the pods: the secret
has `disableNameSuffixHash`, so its name never changes and nothing notices.
Follow it with `kubectl -n watchly-home rollout restart deploy/api deploy/transcoder-worker`.

---

## 6. Day-to-day

```bash
kubectl config set-context --current --namespace=watchly-home   # once

kubectl get pods
kubectl logs -f deploy/api
kubectl logs -f deploy/transcoder-worker
kubectl rollout restart deploy/api

kubectl port-forward svc/grafana 3001:3000    # http://localhost:3001, user admin
kubectl port-forward svc/minio 9001:9001      # MinIO console, not on the ingress
kubectl exec -it deploy/postgres -- psql -U watchly -d watchly
```

---

## 7. What this setup does not do

- **No backups.** The volumes are directories under
  `/var/lib/rancher/k3s/storage` on the node. Nothing copies them anywhere.
- **No TLS, LAN only.** The hostnames carry the LAN address, so they do not
  work over Tailscale either; that needs a second set of hosts in
  `ingress.yaml` pointing at the Tailscale IP.
- **Single node, single replica.** `local-path` volumes are pinned to the
  node that first mounted them, and the api `Deployment` is one pod.
- **`chainguard/minio:latest` moves.** A pod restart can pull a newer build.
- **No first admin.** A fresh database has no users, and registration only
  ever creates a `USER`. Promote one by hand:
  ```sql
  UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
  ```

---

## 8. Failures already hit, and what they meant

| Symptom | Cause | Fix |
|---|---|---|
| api/worker `CrashLoopBackOff`, `Missing required environment variable: X` | Every config value is mandatory in production | Add it to `.env.secrets` (secret) or `kustomization.yaml` (non-secret), then `rollout restart` |
| api/worker crash with `NotImplemented ... BucketName: raw` | MinIO has no `PutBucketCors` | Fixed in `S3Service` — it catches this one error |
| minio `ImagePullBackOff`, `insufficient_scope: authorization failed` | MinIO's own images refuse anonymous pulls | Use the Chainguard image |
| loki/grafana `Pending` forever | `do-block-storage` does not exist here | `storage-class-patch.yaml` |
| `PersistentVolumeClaim ... unknown field "spec.resources.storage"` | Missing the `requests:` level in the claim | Nest `storage:` under `resources.requests` |
| `The Job "minio-buckets" is invalid: field is immutable` | A Job's pod template cannot be edited, and the ConfigMap hash it references changed | Delete the Job, apply again |
| `kubectl` says `localhost:8080 connection refused` | No kubeconfig at `~/.kube/config` | Copy the k3s one there, or export `KUBECONFIG` |
