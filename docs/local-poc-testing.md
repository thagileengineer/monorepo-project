# Testing the local MF registry POC (MinIO)

This walkthrough exercises the **S3-compatible MinIO** layout: immutable `app/semver/` object prefixes, a mutable `app/latest/` mirror, the shell loading remotes from `latest/` by default, and **pinned** semver loads via query or `sessionStorage`.

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** and **npm** | Same as the workspace (`npm ci` at repo root). |
| **Docker** and **Docker Compose** | Used to run MinIO and the one-shot `mc` bucket/CORS setup. |
| **AWS CLI v2** | `aws --version` — used by `publish:poc` as an S3 client against MinIO. |

Optional: **bump** versions with `npm run bump:mfe -- <app> <major|minor|patch>` (see [Version bumps](#optional-version-bumps-and-re-publish)).

## 1. Start MinIO

From the repository root:

```sh
npm run minio:up
```

Wait a few seconds so the `minio-mc` service can create the **`mf-poc`** bucket, set **public download**, and apply **CORS** ([`deploy/minio-cors.json`](../deploy/minio-cors.json)).

- **S3 API:** `http://localhost:9000`
- **Console:** `http://localhost:9001` — user `minioadmin`, password `minioadmin`

To stop later:

```sh
npm run minio:down
```

## 2. Publish builds to MinIO

Set **`MFE_ASSET_BASE`** to the URL the **browser** will use for remote manifests (path-style, **no trailing slash**):

```sh
export MFE_ASSET_BASE=http://localhost:9000/mf-poc/mf
npm run publish:poc
```

This script:

1. Runs [`tools/build-versioned-deploy.mjs`](../tools/build-versioned-deploy.mjs) (reads [`mfe-versions.json`](../mfe-versions.json), generates a prod manifest with `.../mfe01/latest/mf-manifest.json` (and the other remotes), builds each app into `dist/deploy/...`).
2. Syncs `dist/deploy/` to `s3://mf-poc/mf/` via `aws s3 sync` with `--endpoint-url` (default `http://127.0.0.1:9000`).
3. Mirrors each app’s current semver folder to `s3://mf-poc/mf/{app}/latest/`.

**Credentials:** if `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` are unset, the script defaults to MinIO’s `minioadmin` / `minioadmin`.

**Override env vars** (optional): `MINIO_ENDPOINT`, `MFE_POC_BUCKET`, `MFE_POC_PREFIX` — see the header in [`tools/publish-poc.mjs`](../tools/publish-poc.mjs).

### Sanity-check objects in MinIO

In the console, open bucket **`mf-poc`**, prefix **`mf/`**. You should see `mfe01`, …, `mfe10`, `shell`, each with a semver folder (e.g. `1.0.0`) and **`latest/`**.

Or with AWS CLI:

```sh
aws s3 ls s3://mf-poc/mf/mfe01/ --endpoint-url http://127.0.0.1:9000
```

## 3. Serve the shell locally

The POC shell is the same tree that was uploaded under `mf/shell/{semver}/` (semver from `mfe-versions.json` → `shell`):

```sh
npm run serve:shell:poc
```

Default URL: **http://localhost:4200** (override with `SHELL_POC_PORT`).

Keep MinIO running; the shell page will **fetch remotes from MinIO** (cross-origin).

## 4. Manual tests in the browser

### Default: `latest` remotes

1. Open `http://localhost:4200`.
2. Navigate to **`/mfe01`** … **`/mfe10`** (shell routes). Each remote should load from  
   `http://localhost:9000/mf-poc/mf/mfe01/latest/mf-manifest.json` (and the matching path for other remotes; confirm in DevTools → Network).

### Pin a remote to a specific semver

Use a query parameter **`mf.{remoteName}={semver}`** (example: `mf.mfe01=1.0.0` — the segment after `mf.` must match the remote key):

```text
http://localhost:4200/mfe01?mf.mfe01=1.0.0
```

That remote’s manifest URL should switch from `.../mfe01/latest/...` to `.../mfe01/1.0.0/...`. The semver folder must exist in MinIO (from a previous publish).

**Precedence:** query pins override **`sessionStorage`** overrides, which override the baked-in manifest.

### Pin via `sessionStorage`

1. Open DevTools → Console.
2. Run:

   ```js
   sessionStorage.setItem('mf_versions', JSON.stringify({ mfe01: '1.0.0' }));
   location.reload();
   ```

3. Load a route that uses `mfe01` and confirm the pinned path in Network.

## 5. Optional: version bumps and re-publish

To simulate a new “package” version for one app:

```sh
npm run bump:mfe -- mfe01 patch
```

Then:

```sh
export MFE_ASSET_BASE=http://localhost:9000/mf-poc/mf
npm run publish:poc
```

Verify in MinIO (or `aws s3 ls`) that:

- A **new** semver prefix exists under `mf/mfe01/`.
- **`mf/mfe01/latest/`** matches the **new** version’s files.

Reload the shell (no query pin): `mfe01` should load the new **`latest`** build.

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| `Cannot connect to the Docker daemon` / `docker.sock` | Start **Docker Desktop** (or your Docker runtime) and wait until it is fully up; run `docker info` to confirm. On macOS the daemon is not running until the app is. |
| `zsh: command not found: aws` | Install AWS CLI v2, e.g. **macOS:** `brew install awscli`. Open a new terminal and run `aws --version`. |
| `publish:poc` fails on `aws` | Install AWS CLI v2; ensure `aws` is on `PATH` (Homebrew: `/opt/homebrew/bin/aws`). |
| `write EPIPE` / `Error: write EPIPE` during `publish:poc` | The Nx daemon restarted mid-pipeline (often after **`package.json` or lockfile** changed). `tools/build-versioned-deploy.mjs` sets **`NX_DAEMON=false`** for each `nx run`. Avoid editing deps or running `npm install` while publishing; retry `npm run publish:poc`. |
| Access Denied on `s3 sync` | MinIO credentials; default is `minioadmin` / `minioadmin`. |
| Connection refused on 9000 | `npm run minio:up`; `docker compose -f docker-compose.minio.yml ps`. |
| Browser CORS errors on MinIO | `minio-mc` must finish (`mc cors set`); restart compose if you wiped volumes. |
| Shell 404 / empty | Run `publish:poc` before `serve:shell:poc`; ensure `dist/deploy/shell/{version}/` exists for the `shell` entry in `mfe-versions.json`. |
| Pin has no effect | Remote name must match manifest keys (`mfe01`, not `Mfe01`). URL must use `mf.mfe01=` exactly. |
| Wrong manifest for day-to-day dev | Run `npm run manifest:dev` to restore localhost ports for `nx serve shell`. |

## Related files

| File | Role |
|------|------|
| [`docker-compose.minio.yml`](../docker-compose.minio.yml) | MinIO + `mc` init |
| [`tools/publish-poc.mjs`](../tools/publish-poc.mjs) | Build + S3 sync + `latest/` mirror |
| [`tools/serve-shell-poc.mjs`](../tools/serve-shell-poc.mjs) | Static server for POC shell |
| [`apps/shell/src/mf-remote-overrides.ts`](../apps/shell/src/mf-remote-overrides.ts) | Query / `sessionStorage` pin contract |
| [`mfe-versions.json`](../mfe-versions.json) | Semver per app for each publish |

This POC does **not** replace the existing [`Dockerfile`](../Dockerfile) nginx flow; it only simulates an S3-style registry locally.
