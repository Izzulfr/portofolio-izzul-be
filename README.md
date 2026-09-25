# portfolio-backend

Headless CMS API for [Izzul Faturrizky](https://portofolioizzul.vercel.app)'s portfolio.
Express 5 · TypeScript · Drizzle ORM · PostgreSQL · JWT.

This repository only serves JSON. The public site, the admin panel **and every image
or document** live in [`portfolio-frontend`](../portfolio-frontend): files sit in its
`public/media` folder and are served by the site's host, so nothing depends on this
server's disk (which free hosts such as Render wipe on every deploy).

## Quick start

Requires Node 22.12+ and Docker (or any PostgreSQL 14+).

```bash
cp .env.example .env         # then set JWT_ACCESS_SECRET and ADMIN_PASSWORD
npm install
npm run db:up                # PostgreSQL 18 on localhost:5434
npm run db:migrate
npm run db:seed              # admin account + content from the CV
npm run dev                  # http://localhost:4000/api/v1
```

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Sign in at `http://localhost:5173/admin` (with the frontend running) using
`ADMIN_EMAIL` and `ADMIN_PASSWORD`, then change the password on the **Account** page.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | API in watch mode |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run typecheck` | Type-check without emitting |
| `npm run db:up` | Start the PostgreSQL container from `docker-compose.yml` |
| `npm run db:generate` | Create a SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (`db:migrate:prod` runs the compiled version) |
| `npm run db:seed` | Load starting content; safe to re-run (see below) |
| `npm run db:seed -- --fresh` | Wipe the content tables and reload them — never users or messages |
| `npm run db:studio` | Browse the database with Drizzle Studio |
| `npm run admin:password -- <email> "<password>"` | Reset (or create) an admin account from the terminal |

## Environment

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | — | Required. Neon/Supabase URLs with `?sslmode=require` work as is. |
| `JWT_ACCESS_SECRET` | — | Required, 32+ characters. |
| `ACCESS_TOKEN_TTL_MINUTES` | `15` | Lifetime of the bearer token. |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Lifetime of a sign-in. |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated browser origins allowed to call the API. |
| `COOKIE_SAMESITE` | `lax` | `none` only when the site and API are on different sites (needs `COOKIE_SECURE=true`). |
| `COOKIE_SECURE` | on in production | |
| `TRUST_PROXY` | `false` | Set to `1` behind Render, Railway, Nginx… so rate limits see real client IPs. |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | — | Used by the seed to create the first admin. |
| `MEDIA_DRIVER` | `auto` | Where CMS uploads go: `filesystem`, `github` or `readonly` — see [Media storage](#media-storage). |
| `MEDIA_DIR` | `../portfolio-frontend/public/media` | The frontend's media folder, for the `filesystem` driver. |
| `GITHUB_TOKEN`, `GITHUB_REPO` | — | Enable the `github` driver, e.g. `GITHUB_REPO=izzul/portfolio-frontend`. |
| `GITHUB_BRANCH`, `GITHUB_MEDIA_PATH` | `main`, `public/media` | Branch the host deploys from, and the folder inside the repository. |
| `MAX_UPLOAD_MB` | `10` | Upload size limit. |
| `SMTP_*`, `MAIL_FROM`, `CONTACT_NOTIFY_EMAIL` | — | Optional email alert for new contact messages. |
| `SITE_URL` | — | Used for the inbox link in those emails. |

The server validates the environment on start and lists every problem at once.

## API

Every response is JSON: `{ "data": … }`, lists may add `"meta"`, and errors are
`{ "error": { "code", "message", "details"? } }` where `details` holds per-field
messages such as `{ "path": "slug", "message": "Already in use." }`.

### Public — `/api/v1`

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/site` | Profile, site settings, social links and stats in one request |
| GET | `/projects?featured=true` | Published projects (without the case study body) |
| GET | `/projects/:slug` | One project with `previous` / `next` |
| GET | `/experiences`, `/skills`, `/education`, `/certifications`, `/organizations` | Published rows in display order |
| GET | `/posts?tag=&page=&pageSize=` | Published posts, paginated; `meta.tags` lists every topic |
| GET | `/posts/:slug` | One post with older / newer neighbours |
| POST | `/contact` | Stores a message (5 per hour per IP, honeypot field `extraInfo`) |
| GET | `/health` | `{ status, database }` |

### Auth — `/api/v1/auth`

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/login` | `{ email, password }` → `{ accessToken, expiresIn, user }` + refresh cookie. 10 failed attempts per 15 minutes. |
| POST | `/refresh` | Rotates the refresh cookie and returns a new access token |
| POST | `/logout` | Ends the session (the whole token family) |
| GET / PATCH | `/me` | Read or update the signed-in admin's name and email |
| PATCH | `/password` | `{ currentPassword, newPassword }`; signs out every other session |

### Admin — `/api/v1/admin` (Bearer token)

| Path | Operations |
| --- | --- |
| `/projects`, `/experiences`, `/skill-groups`, `/education`, `/certifications`, `/organizations`, `/posts`, `/stats`, `/social-links` | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `POST /reorder` with `{ ids }` |
| `/profile`, `/settings` | `GET /`, `PUT /` |
| `/messages` | `GET /?status=unread`, `PATCH /:id` with `{ isRead }`, `POST /read-all`, `DELETE /:id` |
| `/media` | `GET /` (files + storage info), `POST /` (multipart `file` and `folder`), `DELETE /?path=projects/cover.gif` (refuses files still in use unless `&force=true`) |
| `/overview` | Counts and recent messages for the dashboard |

Collection routes are generated from `src/modules/admin/resources.ts`. Adding a content
type means a table in `schema.ts`, a migration, and one entry in that file.

## How authentication works

- **Access token**: a 15-minute HS256 JWT the admin panel keeps in memory only and sends as `Authorization: Bearer`.
- **Refresh token**: a random value in an `httpOnly` cookie scoped to `/api/v1/auth`. The database stores only its SHA-256 hash.
- **Rotation**: every refresh replaces the token. All tokens from one sign-in share a `family_id`, so signing out revokes the whole chain.
- **Reuse detection**: a rotated token presented again after 30 seconds is treated as stolen and every session for that account ends. The short grace window exists because two open tabs can refresh at the same moment.
- Passwords are hashed with argon2id. Unknown emails still run a full hash comparison, so response times do not reveal which accounts exist.
- Cookie-authenticated endpoints refuse requests whose `Origin` is not in `CORS_ORIGINS`.

## Media storage

Images and documents are **stored in the frontend repository**, in
`portfolio-frontend/public/media/{projects,posts,profile,site,documents}`, and served by
the site itself (Vercel's CDN in production). Content only stores paths such as
`/media/projects/cover.gif`. This API never serves files; it only writes them when an
editor uploads through the CMS, using one of three drivers:

| Driver | Writes to | When |
| --- | --- | --- |
| `filesystem` | The frontend checkout next to this one (`MEDIA_DIR`) | Local development. The Vite dev server shows new files immediately; commit them to publish. |
| `github` | A commit to the frontend repository, through the GitHub API | Production. The host redeploys on the commit, so a new file is live in about a minute. |
| `readonly` | Nowhere | Uploads are off. The CMS still lists and picks files from the site's `/media/manifest.json`. |

`MEDIA_DRIVER=auto` (the default) uses `github` when `GITHUB_TOKEN` and `GITHUB_REPO` are
set, `filesystem` when `MEDIA_DIR` exists outside production, and `readonly` otherwise.

### Setting up GitHub storage (for Render or any host without a persistent disk)

1. On GitHub: **Settings → Developer settings → Fine-grained tokens → Generate new token**.
   Limit it to the `portfolio-frontend` repository and grant **Contents: Read and write**.
2. Set `GITHUB_TOKEN`, `GITHUB_REPO=owner/portfolio-frontend` and, if needed,
   `GITHUB_BRANCH` on the backend host.
3. Check that Vercel deploys that branch automatically.

Every upload or deletion is a commit (`cms: add public/media/…`), so run `git pull` in
your local frontend checkout before pushing code changes.

Uploads accept JPG, PNG, WebP, AVIF, GIF and PDF. The first bytes of each file are checked
against its claimed type, SVG is refused, names are slugified, and a clashing name gets a
numbered suffix (`cover-2.gif`).

## Seed content

`npm run db:seed` fills **empty** tables only, and adds projects and posts by slug, so
edits made in the CMS are never overwritten. Its content comes from the CV, with two
things to review before launch:

- **The three blog posts are samples** written around the CV's skills (ITIL, UAT, BRD). Rewrite or unpublish them.
- **Project covers**: the school attendance and stock/issuer projects point at the GIF recordings in `portfolio-frontend/public/media/projects/`; the other projects get a generated "deliverables" cover until an image is added.

## Deployment

Full walkthrough for **Vercel + Render + Neon**: [DEPLOYMENT.md](DEPLOYMENT.md).

Short version:

1. Create a PostgreSQL database (Neon's free tier has no expiry; Render's free one is deleted
   after 30 days).
2. Deploy this repository with the included `render.yaml` blueprint. It sets the build command
   (`npm ci && npm run build`), the start command (`npm run db:migrate:prod && npm start`, so
   migrations run on every boot) and the `/health` check, and asks for the secrets.
3. Seed the content once from your machine:
   ```bash
   DATABASE_URL="postgres://…" npm run db:seed
   ```
4. Deploy the frontend to Vercel and set `CORS_ORIGINS` (and `SITE_URL`) here to its URL.
5. Optional: add `GITHUB_TOKEN` and `GITHUB_REPO` so the production CMS can upload images —
   see [Media storage](#media-storage).

## Project structure

```
drizzle/                 generated SQL migrations
src/
  app.ts, server.ts      Express app and process lifecycle
  config/env.ts          validated environment
  db/                    schema, client, migrate script, seed
  lib/                   errors, validation helpers, tokens, passwords, mailer
  middleware/            auth, rate limits, error handling
  modules/
    auth/                login, refresh, logout, account
    public/              read-only content for the site
    contact/             contact form
    admin/               CRUD factory, resource definitions, messages
    media/               media routes and the filesystem / GitHub / read-only drivers
  scripts/               reset-password
```
