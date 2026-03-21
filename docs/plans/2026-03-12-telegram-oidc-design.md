# Telegram OIDC Design

## Goal

Replace the browser-side Telegram Login Widget flow with Telegram OIDC while keeping:

- anonymous guest play unchanged
- Telegram Mini App sign-in for in-app sessions
- registered-only gating for wallet, shop, cosmetics, and non-guest queues

## Chosen Approach

- Browser sessions use `signInWithTelegramOIDC(...)`
- Mini App sessions continue to use `signInWithMiniApp(...)`
- Backend enables Telegram OIDC with `loginWidget: false`
- Backend requires the BotFather-issued OIDC client secret at startup

## Backend Changes

- Configure the Telegram plugin with:
  - `loginWidget: false`
  - `miniApp.enabled: true`
  - `oidc.enabled: true`
  - `oidc.clientSecret` from env
- Add env support for:
  - `TELEGRAM_OIDC_CLIENT_ID` optional override
  - `TELEGRAM_OIDC_CLIENT_SECRET` required

## Frontend Changes

- Remove widget initialization and iframe container from the homepage
- Show a single browser CTA that starts the OIDC flow
- Keep the Mini App-specific CTA only when Telegram Mini App context is present
- Preserve guest queue access and registered-only gating

## Local Dev Notes

- Browser Telegram auth now depends on BotFather OIDC configuration, not widget embedding
- Use HTTPS in local dev, typically via ngrok
- Configure OIDC in the BotFather mini app, not the legacy BotFather chat menu
- The `Domain` setting is for the older login flow and is not where the OIDC client secret is shown
- BotFather must register:
  - allowed origin
  - redirect URL for `/api/auth/callback/telegram-oidc`

## Validation

- backend config test enforces the OIDC client secret requirement
- frontend/backend/shared type-checks should pass
- browser auth UX should no longer render the widget container
