# TapMore backend

AdonisJS 7 API, TypeScript, PostgreSQL, Lucid, VineJS, and Cloudflare Images.
This checkout is the backend foundation. The existing landing and dashboard still use browser-local drafts and have not been connected to this API. No backend deployment has been created.

## Local setup

Use Node.js 24+ and pnpm 11.25.0. From this directory:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
node ace generate:key
# Requires Docker; alternatively provide an existing PostgreSQL database in .env.
docker compose up -d
node ace migration:run
pnpm dev
```

`GET http://127.0.0.1:3333/health` checks process health, not database readiness.
The Compose database is for local development only. Production needs its own credentials, TLS, backups, and explicit CORS origins. Configure trusted proxies for the deployment topology before relying on client IP rate limiting.

## API contract

Protected routes require `Authorization: Bearer <token>`. Auth tokens expire after seven days. Logout revokes the current token. Passwords are hashed using the framework's scrypt driver and excluded from responses.

| Method | Path                             | Access / result                                                                                           |
| ------ | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/auth/signup`            | `fullName` (string or null), `email`, `password`, `passwordConfirmation`; returns `{data: {user, token}}` |
| POST   | `/api/v1/auth/login`             | `email`, `password`; returns `{data: {user, token}}`                                                      |
| GET    | `/api/v1/account/profile`        | Authenticated user, under `data`                                                                          |
| POST   | `/api/v1/account/logout`         | Authenticated; revokes current token                                                                      |
| GET    | `/api/v1/usernames/:username`    | `{username, available}`; availability is advisory                                                         |
| GET    | `/api/v1/page`                   | Authenticated; `{page, publishedAt}`, or 404                                                              |
| PUT    | `/api/v1/page`                   | Authenticated; saves validated page and atomically claims username                                        |
| POST   | `/api/v1/page/publish`           | Authenticated; copies saved draft to published snapshot                                                   |
| DELETE | `/api/v1/page/publish`           | Authenticated; unpublishes; 204                                                                           |
| GET    | `/api/v1/public/pages/:username` | Published snapshot only; excludes hidden links                                                            |
| POST   | `/api/v1/images/uploads`         | Authenticated; `{id, uploadURL}`; 503 when unconfigured                                                   |
| POST   | `/api/v1/images/:id/confirm`     | Authenticated owner; verifies upload with Cloudflare                                                      |

The page payload retains the POC shape:

```json
{
  "name": "Alex Morgan",
  "username": "alexmorgan",
  "bio": "Designer and maker.",
  "initials": "AM",
  "theme": "mint",
  "links": [
    {
      "id": "first-link",
      "title": "Portfolio",
      "url": "https://example.com",
      "category": "Explore",
      "featured": true,
      "visible": true
    }
  ]
}
```

Themes: `lilac`, `sand`, `mint`. Categories: `Explore`, `Learn`, `Shop`, `Connect`.
Only HTTP(S) links are accepted. Maximum 100 links; name 100 characters; bio 500; link titles 160; URLs 2048. Empty bio and initials are supported. Backup envelopes must be unpacked by the client before sending their page.

Usernames normalize to lowercase, use 3–24 letters/digits/underscores/hyphens, and start with a letter or digit. Reserved names and database uniqueness prevent claims; conflicts return 409. One page per user. A published username cannot change until unpublishing. Draft saves never change a published snapshot. Public responses use `Cache-Control: no-store` so unpublishing does not leave an application cache behind.

Guest personalization remains browser-local and requires no account. At publishing, the client should authenticate, send its existing page to `PUT /page`, then explicitly call the publish endpoint. It must retain its local draft until saving succeeds. The public endpoint returns JSON; a rendered public profile route still needs frontend implementation.

## Cloudflare Images

Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_IMAGES_TOKEN` in the server environment. Use a token limited to Images Write for the intended account; never put it in frontend configuration.

1. Authenticated client requests an upload allocation.
2. Server records the returned image ID against the user and returns the one-time URL.
3. Client submits the file as multipart field `file` directly to `uploadURL`.
4. Client calls the confirmation endpoint. The backend checks ownership and queries Cloudflare to verify completion.

Allocations expire after ten minutes. Each account has a maximum of 50 tracked allocations, including abandoned ones. Uploads require signed delivery URLs, keeping draft media private. Attaching images to pages, signed delivery URL generation, image deletion, and abandoned-upload cleanup are follow-up work. No image delivery URLs or avatar integration are claimed here. Failed database writes after allocation may leave an expiring Cloudflare allocation; reconciliation is still needed. Live account behavior has not been verified without credentials.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build --package-manager=pnpm
```

Functional tests delete records in the configured database. **Always use a dedicated test database.** CI creates an isolated PostgreSQL 17 service, runs migrations, then checks types, lint, tests, and production compilation. The workflow is added locally; it has not run on GitHub yet.

Local functional checks used PGlite (PostgreSQL WASM) through the PostgreSQL wire protocol with a one-connection pool (`DB_POOL_MAX=1`), because native PostgreSQL shared memory was blocked by the execution sandbox. This verifies SQL behavior but does not establish native PostgreSQL concurrency behavior. The native PostgreSQL CI run remains necessary.

Rate limits use atomic PostgreSQL counters: 10 auth requests/minute per IP and 120 other API requests/minute per IP. Images additionally enforce the per-account quota. Expired counters should be periodically removed using `DELETE FROM rate_limits WHERE expires_at < CURRENT_TIMESTAMP`; tokens and orphaned images also need scheduled cleanup before launch.

## Remaining launch work

Connect and migrate the frontends; render public profile pages; add browser authentication storage strategy, email verification and account recovery; wire private/public image delivery; validate concurrent username claims on native PostgreSQL; provision hosting and database; verify live Cloudflare uploads; add monitoring, backup recovery, and deployment checks. Custom domains and production analytics are not implemented.

Related repositories: [landing](https://github.com/agosh-durdyyev/tapmore-fe), [dashboard](https://github.com/agosh-durdyyev/tapmore-dashboard).
