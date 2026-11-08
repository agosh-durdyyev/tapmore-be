# TapMore backend

AdonisJS 7, TypeScript, PostgreSQL, passwordless authentication, and Cloudflare Images.
Requires Node.js 24+ and pnpm 11.25.0.

## Local development

```sh
pnpm install --frozen-lockfile
cp .env.example .env
node ace generate:key
docker compose up -d
node ace migration:run
pnpm dev
```

Use a dedicated database for tests: functional suites delete test data. `.env.test`
selects `tapmore_test`; CI provisions an isolated PostgreSQL service.

```sh
NODE_ENV=test node ace migration:run
pnpm typecheck
pnpm lint
pnpm test
pnpm build --package-manager=pnpm
```

## Features and API

Routes live in `start/routes.ts`; requests and responses are implemented in
`app/controllers`. All routes below use `/api/v1`. Account routes require a bearer
token. Sessions last 90 days. Sign in through Google, Apple, or a six-digit email
code; there is no password authentication.

- `/auth/google`, `/auth/apple`, `/auth/email/code`, `/auth/email/verify`: passwordless sign-in.
- `/account/profile`, `/account/logout`: current profile and current-session logout.
- `POST /account/email`: send a code to a proposed new email address.
- `POST /account/email/verify`: verify that code, change the email, disconnect old
  social identities, and revoke all sessions. Email-change codes are scoped to
  the account and cannot be used as login codes. Five guesses and a ten-minute expiry.
- `POST /account/logout-all`: revoke all sessions for the current account.
- `DELETE /account`: confirm with `{email}`; remove account data and queue uploaded
  files for permanent deletion. Client-side copies on other devices remain.
- `/page`: retrieve or save a private draft. `If-Match` revision checks prevent stale saves.
- `/page/publish`: publish a snapshot, or DELETE to unpublish.
- `/page/versions`: list/create snapshots; `/:number` reads one and `/:number/restore`
  restores it to the draft. History retains up to 100 recent versions plus protected versions.
- `/page/experiment`: weighted A/B tests of saved versions; `/stop` stops the test.
- `/page/activity`: owner-only 30-day public visits and clicks.
- `/public/pages/:username`: public snapshot or experiment variant, with inactive links excluded.
- `/public/pages/:username/events`: public activity recording; inactive-link clicks are rejected.
- `/public/pages`: published addresses for the sitemap.
- `/images/uploads`, `/images/:id/confirm`: allocate and confirm authenticated uploads.
- `GET /images`: upload count and number eligible for cleanup.
- `POST /images/cleanup`: queue unused uploads older than 24 hours for deletion.
- `/ai/import`, `/ai/suggest`: constrained, rate-limited imports and title/bio suggestions.

## Link schedules

Links optionally include `startsAt` and `endsAt` as UTC ISO timestamps, for example
`2026-11-08T09:00:00.000Z`. Start is inclusive; end is exclusive and must follow
start. Either boundary may be omitted. `visible: false` always overrides the
schedule. Drafts and history preserve these fields; public responses evaluate the
schedule on each request, including experiment variants. Publishing is still explicit.

## Media lifecycle

Cloudflare credentials stay server-side. Upload allocations last ten minutes;
photos have public delivery URLs. Accounts may track at most 50 uploads.

The web process scans hourly for uploads older than 24 hours that are not referenced
by the owner's saved draft, published page, or retained version history. Those
uploads are queued for deletion. Unsaved browser drafts and downloaded backup files
cannot protect their photos from cleanup. Queued images still count toward the
quota until removal finishes. References are checked again before deletion.

A durable `image_deletions` queue survives account deletion. The web process drains
up to ten files each minute, retries provider failures, and treats a missing provider
file as already deleted. Run migrations before starting the new build. Keep at least
one API web process running with Cloudflare credentials for cleanup to progress;
monitor the queue age and cleanup warnings. Provider delivery/cache invalidation is
outside the database transaction.

## Production operations

Configure explicit CORS origins, trusted proxies, mail, social client IDs, Cloudflare,
and optional Anthropic credentials using `.env.example`. `/health` checks the
process, not database readiness. Use database TLS, backups, and restore drills.
Analytics stores visitor IPs for 30 days and honors DNT/GPC in the public client.
Live provider behavior and deployment configuration must be verified separately
from local tests. Custom domains, billing, lead capture, and moderation tooling
are not implemented.
