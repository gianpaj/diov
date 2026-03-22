# Early Testing Deployment

## Target Setup

For early external testing, deploy the stack like this:

- frontend: Vercel
- backend: Vercel
- realtime multiplayer authority: self-hosted SpacetimeDB on Hetzner
- auth/economy database: remote Turso/libSQL

This keeps the browser app and HTTP backend on managed hosting while leaving authoritative realtime gameplay on your existing Hetzner machine.

## Important Constraints

- Do not use `file:local.db` on Vercel. Vercel functions do not give you durable local disk. Use remote Turso/libSQL.
- SpacetimeDB does not run on Vercel in this setup. The frontend connects directly to your Hetzner-hosted SpacetimeDB instance.
- Backend and frontend origins must match exactly. Do not mix `localhost` and `127.0.0.1`.
- Telegram browser auth needs the BotFather mini app path: `Bot Settings -> Web Login`.

## One-Time Infra

### 1. Turso / libSQL

Create a remote database for auth and economy state.

Required backend env:

```env
TURSO_DATABASE_URL=libsql://<database>-<org>.turso.io
TURSO_AUTH_TOKEN=<token>
```

### 2. SpacetimeDB on Hetzner

Have a public HTTPS endpoint for your SpacetimeDB server, for example:

```txt
https://spacetimedb.yourdomain.com
```

Frontend production env should point to that host:

```env
VITE_SPACETIMEDB_HOST=https://spacetimedb.yourdomain.com
VITE_SPACETIMEDB_DB_NAME=battle-circles
```

If your Hetzner host already runs SpacetimeDB correctly, you likely only need to republish the module when reducers or schema change.

### 3. Vercel Projects

Create two Vercel projects from this monorepo:

- project 1 root directory: `apps/frontend`
- project 2 root directory: `apps/backend`

Use the repo-level monorepo link flow so Vercel builds from the repository root while keeping separate app roots.

## Backend on Vercel

The backend now includes a Vercel function entrypoint at:

- `apps/backend/api/[[...route]].ts`

That file imports the existing Hono app and initializes the economy schema on cold start.

### Backend Production Env

Set these in the backend Vercel project:

```env
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://<frontend-domain>
BETTER_AUTH_URL=https://<backend-domain>
BETTER_AUTH_SECRET=<32+ char secret>
TURSO_DATABASE_URL=libsql://<database>-<org>.turso.io
TURSO_AUTH_TOKEN=<token>
DISCORD_CLIENT_ID=<discord-client-id>
DISCORD_CLIENT_SECRET=<discord-client-secret>
TELEGRAM_BOT_TOKEN=<telegram-bot-token>
TELEGRAM_BOT_USERNAME=<bot-username-without-@>
TELEGRAM_OIDC_CLIENT_ID=<telegram-oidc-client-id>
TELEGRAM_OIDC_CLIENT_SECRET=<telegram-oidc-client-secret>
```

Notes:

- `BETTER_AUTH_URL` must be the backend Vercel URL or your backend custom domain.
- `CORS_ORIGIN` must be the frontend Vercel URL or your frontend custom domain.
- Telegram callback URL must match:

```txt
https://<backend-domain>/api/auth/callback/telegram-oidc
```

## Frontend on Vercel

### Frontend Production Env

Set these in the frontend Vercel project:

```env
VITE_BETTER_AUTH_URL=https://<backend-domain>
VITE_SPACETIMEDB_HOST=https://spacetimedb.yourdomain.com
VITE_SPACETIMEDB_DB_NAME=battle-circles
```

Notes:

- `VITE_BETTER_AUTH_URL` should not point to localhost in production.
- `VITE_SPACETIMEDB_HOST` should be the public HTTPS endpoint in front of your Hetzner SpacetimeDB server.

## Publishing SpacetimeDB Changes to Hetzner

If gameplay code changed, regenerate and publish before or alongside the web deploy:

```bash
pnpm --filter @battle-circles/shared codegen
pnpm --filter @battle-circles/spacetimedb generate
```

If your Hetzner SpacetimeDB instance allows publish from your machine:

```bash
spacetime server add hetzner --url https://spacetimedb.yourdomain.com
spacetime login hetzner
pnpm --filter @battle-circles/spacetimedb publish --server hetzner battle-circles
```

If your Hetzner Nginx config blocks remote publish, publish from the host after copying the built module. This follows the official SpacetimeDB self-hosting guidance.

## Vercel CLI Workflow

Run from the repo root:

```bash
pnpm dlx vercel login
pnpm dlx vercel link --repo
```

During project setup, create or link:

- one project with root directory `apps/frontend`
- one project with root directory `apps/backend`

Then deploy:

```bash
pnpm dlx vercel deploy --prod --cwd .
```

If you prefer explicit per-project deploys after linking, use the linked project directories:

```bash
pnpm dlx vercel deploy --prod --cwd apps/frontend
pnpm dlx vercel deploy --prod --cwd apps/backend
```

## Early Testing Checklist

Before inviting testers:

1. Confirm frontend loads from Vercel.
2. Confirm `/api/me` responds from the backend Vercel URL.
3. Confirm Better Auth cookies are accepted from the frontend origin.
4. Confirm the frontend connects to Hetzner SpacetimeDB successfully.
5. Confirm queue join, countdown, gameplay, and end-of-match flow work end to end.
6. Confirm guest queue works without Telegram auth.
7. Confirm registered-only queue gating still works.
8. Confirm Telegram callback URL and allowed origin are set in the BotFather mini app.

## Rollback

If a deploy is bad:

1. Roll frontend back in Vercel to the previous deployment.
2. Roll backend back in Vercel to the previous deployment.
3. If the issue is gameplay logic, republish the previous SpacetimeDB module to Hetzner.
4. If the issue is auth/economy schema or env, restore the previous Turso credentials or env configuration.
