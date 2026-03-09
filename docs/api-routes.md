# Battle Circles — Backend API Routes Specification

> **Status:** Planned — not yet implemented  
> **Base URL:** `https://api.battlecircles.io/api` (production) · `http://localhost:3001/api` (dev)  
> **Auth:** JWT Bearer token in `Authorization` header. Guest sessions use a short-lived guest JWT.  
> **Versioning:** No version prefix for now. When breaking changes are needed, prefix with `/v2/`.  
> **Content-Type:** All requests and responses are `application/json` unless noted.

All protected routes return `401` if the token is missing or expired. All validation errors return `400` with a Zod-style error body:

```json
{ "error": "VALIDATION_ERROR", "details": { "field": ["message"] } }
```

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User](#2-user)
3. [Seasons & Online Count](#3-seasons--online-count)
4. [Matches & Stats](#4-matches--stats)
5. [Leaderboard](#5-leaderboard)
6. [Daily Rewards](#6-daily-rewards)
7. [Skins & Inventory](#7-skins--inventory)
8. [Lootboxes](#8-lootboxes)
9. [Tokens & Economy](#9-tokens--economy)
10. [Referrals](#10-referrals)
11. [Shop](#11-shop)
12. [Subscription (Stripe)](#12-subscription-stripe)
13. [Settings](#13-settings)
14. [Internal (Server → Server)](#14-internal-server--server)

---

## 1. Authentication

### `POST /api/auth/guest`

Creates an anonymous guest session. Called automatically on first visit if no JWT exists.

**Request body:** none

**Response `201`:**
```json
{
  "guestId": "guest_01J9...",
  "token": "<jwt>",
  "expiresAt": "2026-03-06T14:00:00.000Z"
}
```

**Notes:**
- Guest progress (match stats, XP) is preserved if the guest later signs in via OAuth — the accounts are merged on first login.
- The JWT expiry for guests is 30 days.

---

### `POST /api/auth/discord`

OAuth2 callback handler. Exchange Discord `code` for a user session.

**Request body:**
```json
{ "code": "discord_oauth_code", "redirectUri": "https://..." }
```

**Response `200`:**
```json
{
  "user": { "id": "...", "displayName": "...", "avatarUrl": "..." },
  "token": "<jwt>",
  "refreshToken": "<refresh_jwt>",
  "isNewUser": true
}
```

---

### `POST /api/auth/telegram`

Verifies Telegram Mini App `initData` string and issues a JWT.

**Request body:**
```json
{ "initData": "<telegram_init_data_string>" }
```

**Response `200`:** same shape as Discord response.

**Notes:**
- Server validates the HMAC signature using `BOT_TOKEN` before trusting any user data.
- If Telegram user ID matches an existing account, they are logged in. Otherwise a new account is created.

---

### `POST /api/auth/refresh`

Exchange a refresh token for a new access JWT.

**Request body:**
```json
{ "refreshToken": "<refresh_jwt>" }
```

**Response `200`:**
```json
{ "token": "<jwt>", "expiresAt": "..." }
```

---

### `DELETE /api/auth/session`

🔒 Protected. Invalidates the current refresh token (logout).

**Response `204`:** no body.

---

## 2. User

### `GET /api/user/me`

🔒 Protected. Returns the full profile for the authenticated user.

**Response `200`:**
```json
{
  "id": "clx...",
  "displayName": "gianpaj",
  "avatarUrl": "https://cdn.discordapp.com/avatars/...",
  "tier": "FREE",
  "tokens": 420,
  "lifetimeTokensEarned": 1840,
  "level": 7,
  "xp": 340,
  "xpToNextLevel": 500,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "premiumUntil": null
}
```

---

### `PATCH /api/user/me`

🔒 Protected. Update mutable profile fields.

**Request body (all optional):**
```json
{
  "displayName": "new_name"
}
```

**Validation:**
- `displayName`: 1–20 chars, alphanumeric + spaces + underscores

**Response `200`:** updated user object (same shape as `GET /api/user/me`).

---

### `GET /api/user/level`

🔒 Protected. Detailed XP breakdown and level history.

**Response `200`:**
```json
{
  "level": 7,
  "xp": 340,
  "xpToNextLevel": 500,
  "totalXpEarned": 3840,
  "levelHistory": [
    { "level": 1, "reachedAt": "2026-01-02T10:00:00.000Z" },
    { "level": 2, "reachedAt": "2026-01-05T14:22:00.000Z" }
  ]
}
```

---

### `GET /api/user/subscription`

🔒 Protected. Current premium subscription status.

**Response `200`:**
```json
{
  "tier": "FREE",
  "premiumUntil": null,
  "monthlyTokenStipend": 0,
  "benefits": []
}
```

Pro user example:
```json
{
  "tier": "PRO",
  "premiumUntil": "2026-04-01T00:00:00.000Z",
  "monthlyTokenStipend": 500,
  "benefits": ["private_rooms", "custom_game_modes", "no_ads", "pro_badge"]
}
```

---

## 3. Seasons & Online Count

### `GET /api/seasons/online`

🌐 Public. Returns the current live player count. Designed to be polled every 15 seconds — response is intentionally tiny.

**Response `200`:**
```json
{ "online": 312 }
```

**Notes:**
- No auth required — called before login to show social proof on the home page.
- Backed by a Redis counter incremented/decremented on socket connect/disconnect.
- Response is cache-controlled for max 10 seconds.

---

### `GET /api/seasons/current`

🌐 Public. Details about the active season.

**Response `200`:**
```json
{
  "id": "season_3",
  "name": "Season 3",
  "gameMode": "BATTLE_ROYALE",
  "startDate": "2026-02-01T00:00:00.000Z",
  "endDate": "2026-03-31T23:59:59.000Z",
  "description": "Last circle standing wins.",
  "rewards": [
    { "placement": 1, "tokens": 200, "lootboxes": 1 },
    { "placement": 2, "tokens": 100, "lootboxes": 0 },
    { "placement": 3, "tokens": 50,  "lootboxes": 0 }
  ]
}
```

---

### `GET /api/seasons/leagues`

🌐 Public. League definitions for the current season.

**Response `200`:**
```json
{
  "leagues": [
    { "id": "bronze",   "name": "Bronze",   "minRating": 0,    "maxRating": 999,  "color": "#CD7F32", "promotionLootbox": true },
    { "id": "silver",   "name": "Silver",   "minRating": 1000, "maxRating": 1999, "color": "#C0C0C0", "promotionLootbox": true },
    { "id": "gold",     "name": "Gold",     "minRating": 2000, "maxRating": 2999, "color": "#FFD700", "promotionLootbox": true },
    { "id": "platinum", "name": "Platinum", "minRating": 3000, "maxRating": 3999, "color": "#4ECDC4", "promotionLootbox": true },
    { "id": "diamond",  "name": "Diamond",  "minRating": 4000, "maxRating": null,  "color": "#667EEA", "promotionLootbox": true }
  ]
}
```

---

## 4. Matches & Stats

### `GET /api/matches/history`

🔒 Protected. Paginated match history for the authenticated user.

**Query params:**
- `page` (default `0`)
- `limit` (default `10`, max `50`)
- `seasonId` (optional — filter to a specific season)

**Response `200`:**
```json
{
  "total": 42,
  "page": 0,
  "limit": 10,
  "matches": [
    {
      "id": "session_abc",
      "startedAt": "2026-02-27T09:00:00.000Z",
      "endedAt": "2026-02-27T09:05:12.000Z",
      "durationMs": 312000,
      "playerCount": 8,
      "placement": 1,
      "score": 3840,
      "peakSize": 142,
      "playersEaten": 4,
      "xpEarned": 80,
      "tokensEarned": 50,
      "ratingDelta": 20,
      "ratingAfter": 1240
    }
  ]
}
```

---

### `GET /api/matches/:id`

🔒 Protected. Full detail for a single match.

**Response `200`:**
```json
{
  "id": "session_abc",
  "startedAt": "...",
  "endedAt": "...",
  "durationMs": 312000,
  "results": [
    {
      "userId": "clx_winner",
      "displayName": "gianpaj",
      "placement": 1,
      "score": 3840,
      "peakSize": 142,
      "playersEaten": 4,
      "isLocalPlayer": true
    }
  ]
}
```

---

### `GET /api/matches/my-season-stats`

🔒 Protected. Aggregate stats for the authenticated user in the current season.

**Response `200`:**
```json
{
  "seasonId": "season_3",
  "matchesPlayed": 42,
  "wins": 8,
  "top3": 18,
  "rating": 1240,
  "league": "silver",
  "rank": 94,
  "totalPlayersInLeague": 1203
}
```

---

### `POST /api/matches/:id/claim`

🔒 Protected. Claim tokens and XP from a finished match. Idempotent.

**Response `200`:**
```json
{
  "tokensAwarded": 50,
  "xpAwarded": 80,
  "newTokenBalance": 470,
  "newXp": 420,
  "newLevel": 7,
  "leveledUp": false
}
```

---

## 5. Leaderboard

### `GET /api/leaderboard/weekly`

🌐 Public (🔒 returns caller's rank if authenticated).

**Query params:**
- `limit` (default `100`, max `100`)

**Response `200`:**
```json
{
  "period": "2026-W09",
  "updatedAt": "2026-02-27T09:30:00.000Z",
  "entries": [
    { "rank": 1, "userId": "clx_1", "displayName": "TopPlayer", "score": 98400, "wins": 24, "avatarUrl": "..." },
    { "rank": 2, "userId": "clx_2", "displayName": "Player2",   "score": 87200, "wins": 21, "avatarUrl": "..." }
  ],
  "callerEntry": {
    "rank": 94,
    "userId": "clx_me",
    "displayName": "gianpaj",
    "score": 12400,
    "wins": 8,
    "avatarUrl": "..."
  }
}
```

**Notes:**
- `callerEntry` is `null` for unauthenticated requests.
- The `callerEntry` is included even if the caller is outside the top 100.

---

### `GET /api/leaderboard/all-time`

🌐 Public. Same shape as weekly leaderboard but ranked by lifetime score.

---

### `GET /api/leaderboard/leagues`

🌐 Public. Top 10 players per league for the current season.

**Response `200`:**
```json
{
  "leagues": {
    "diamond":  [ { "rank": 1, "displayName": "...", "rating": 5200 } ],
    "platinum": [ { "rank": 1, "displayName": "...", "rating": 3800 } ],
    "gold":     [],
    "silver":   [],
    "bronze":   []
  }
}
```

---

## 6. Daily Rewards

### `GET /api/daily-claim`

🔒 Protected. Current streak and reward preview.

**Response `200`:**
```json
{
  "currentStreak": 3,
  "lastClaimedAt": "2026-02-26T08:00:00.000Z",
  "canClaimNow": true,
  "nextClaimAt": null,
  "schedule": [
    { "day": 1, "reward": { "tokens": 10 },                  "claimed": true  },
    { "day": 2, "reward": { "tokens": 20 },                  "claimed": true  },
    { "day": 3, "reward": { "tokens": 25 },                  "claimed": true  },
    { "day": 4, "reward": { "tokens": 30 },                  "claimed": false },
    { "day": 5, "reward": { "tokens": 40 },                  "claimed": false },
    { "day": 6, "reward": { "tokens": 50 },                  "claimed": false },
    { "day": 7, "reward": { "tokens": 100, "lootboxes": 1 }, "claimed": false }
  ]
}
```

---

### `POST /api/daily-claim`

🔒 Protected. Claim today's reward. Returns `409` if already claimed today.

**Response `200`:**
```json
{
  "day": 4,
  "reward": { "tokens": 30 },
  "newStreak": 4,
  "newTokenBalance": 500
}
```

**Response `409`:**
```json
{
  "error": "ALREADY_CLAIMED",
  "nextClaimAt": "2026-02-28T08:00:00.000Z"
}
```

---

## 7. Skins & Inventory

### `GET /api/user/skins`

🔒 Protected. All skins the user owns, including which is currently equipped.

**Response `200`:**
```json
{
  "equipped": "skin_peppermint",
  "skins": [
    {
      "id": "skin_default",
      "name": "Classic",
      "rarity": "COMMON",
      "thumbnailUrl": "https://cdn.battlecircles.io/skins/classic.png",
      "acquiredAt": "2026-01-01T00:00:00.000Z",
      "source": "DEFAULT"
    },
    {
      "id": "skin_peppermint",
      "name": "Peppermint",
      "rarity": "RARE",
      "thumbnailUrl": "https://cdn.battlecircles.io/skins/peppermint.png",
      "acquiredAt": "2026-02-14T00:00:00.000Z",
      "source": "SHOP"
    }
  ]
}
```

---

### `POST /api/user/skins/:id/equip`

🔒 Protected. Equip a skin the user already owns. Takes effect in the next match.

**Response `200`:**
```json
{ "equipped": "skin_peppermint" }
```

**Response `403`:**
```json
{ "error": "SKIN_NOT_OWNED" }
```

---

## 8. Lootboxes

### `GET /api/user/lootboxes`

🔒 Protected. All lootboxes the user owns.

**Response `200`:**
```json
{
  "lootboxes": [
    {
      "id": "lb_instance_xyz",
      "typeId": "lootbox_season3",
      "name": "Season 3 Box",
      "thumbnailUrl": "https://cdn.battlecircles.io/lootboxes/season3.png",
      "acquiredAt": "2026-02-20T00:00:00.000Z",
      "source": "SEASON_REWARD"
    }
  ]
}
```

---

### `POST /api/user/lootboxes/:id/open`

🔒 Protected. Open a specific lootbox instance. Irreversible.

**Response `200`:**
```json
{
  "contents": [
    { "type": "SKIN",   "id": "skin_alien",  "name": "Alien",  "rarity": "RARE" },
    { "type": "TOKENS", "amount": 50 }
  ],
  "newTokenBalance": 550
}
```

---

## 9. Tokens & Economy

### `GET /api/user/tokens`

🔒 Protected. Current balance and lifetime summary.

**Response `200`:**
```json
{
  "balance": 550,
  "lifetimeEarned": 2390,
  "lifetimeSpent": 1840
}
```

---

### `GET /api/user/tokens/history`

🔒 Protected. Paginated token transaction ledger.

**Query params:** `page`, `limit` (default `20`)

**Response `200`:**
```json
{
  "total": 87,
  "entries": [
    {
      "id": "txn_abc",
      "type": "EARN",
      "amount": 50,
      "reason": "MATCH_WIN",
      "referenceId": "session_abc",
      "createdAt": "2026-02-27T09:05:12.000Z",
      "balanceAfter": 550
    },
    {
      "id": "txn_xyz",
      "type": "SPEND",
      "amount": -200,
      "reason": "SKIN_PURCHASE",
      "referenceId": "skin_alien",
      "createdAt": "2026-02-25T14:00:00.000Z",
      "balanceAfter": 500
    }
  ]
}
```

---

## 10. Referrals

### `GET /api/referrals/my`

🔒 Protected. The user's referral code and summary.

**Response `200`:**
```json
{
  "code": "GIANPAJ42",
  "shareUrl": "https://battlecircles.io/?ref=GIANPAJ42",
  "totalReferred": 3,
  "totalEarned": 60,
  "nextMilestone": {
    "friendsNeeded": 5,
    "friendsCount": 3,
    "reward": { "lootboxes": 1 }
  }
}
```

---

### `GET /api/referrals/friends`

🔒 Protected. Paginated list of referred friends.

**Query params:** `page`, `limit` (default `10`)

**Response `200`:**
```json
{
  "total": 3,
  "friends": [
    {
      "displayName": "Player_A",
      "joinedAt": "2026-02-10T00:00:00.000Z",
      "tokensEarnedFromThem": 20
    }
  ]
}
```

---

### `GET /api/referrals/rewards`

🌐 Public. Reward milestones for referrals.

**Response `200`:**
```json
{
  "milestones": [
    { "friendsRequired": 1,  "reward": { "tokens": 20 } },
    { "friendsRequired": 3,  "reward": { "tokens": 50 } },
    { "friendsRequired": 5,  "reward": { "tokens": 100, "lootboxes": 1 } },
    { "friendsRequired": 10, "reward": { "tokens": 250, "lootboxes": 2 } },
    { "friendsRequired": 25, "reward": { "tokens": 500, "lootboxes": 3 } }
  ]
}
```

---

### `POST /api/referrals/register`

🌐 Public. Register a referral relationship when a new user signs up via a referral link.

**Request body:**
```json
{ "referralCode": "GIANPAJ42", "newUserId": "clx_newuser" }
```

**Response `200`:**
```json
{ "registered": true, "referrerId": "clx_referrer" }
```

**Response `409`:** user already has a referrer, or code is invalid.

---

## 11. Shop

### `GET /api/shop/items`

🌐 Public. All purchasable items across all categories.

**Query params:**
- `category` — `SKIN | LOOTBOX | TOKEN_PACK` (optional filter)
- `page`, `limit` (default `20`)

**Response `200`:**
```json
{
  "total": 48,
  "items": [
    {
      "id": "skin_alien",
      "category": "SKIN",
      "name": "Alien",
      "description": "Abducted from the cosmos.",
      "rarity": "RARE",
      "thumbnailUrl": "https://cdn.battlecircles.io/skins/alien.png",
      "price": {
        "tokens": 200,
        "usdCents": null
      },
      "supply": null,
      "remainingSupply": null,
      "salePercent": 0,
      "available": true
    },
    {
      "id": "lootbox_season3",
      "category": "LOOTBOX",
      "name": "Season 3 Box",
      "description": "Contains 2 items. Season-exclusive.",
      "rarity": "EPIC",
      "thumbnailUrl": "https://cdn.battlecircles.io/lootboxes/season3.png",
      "price": {
        "tokens": 500,
        "usdCents": 499
      },
      "supply": 1000,
      "remainingSupply": 312,
      "salePercent": 0,
      "available": true
    }
  ]
}
```

---

### `POST /api/shop/items/:id/buy`

🔒 Protected. Purchase a shop item.

**Request body:**
```json
{ "paymentMethod": "TOKENS" }
```

or for fiat:

```json
{ "paymentMethod": "STRIPE", "successUrl": "https://...", "cancelUrl": "https://..." }
```

**Response `200` (token purchase):**
```json
{
  "purchaseId": "purchase_abc",
  "item": { "id": "skin_alien", "name": "Alien" },
  "tokensCost": 200,
  "newTokenBalance": 350
}
```

**Response `200` (Stripe — returns checkout URL):**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_live_..."
}
```

**Response `402`:**
```json
{ "error": "INSUFFICIENT_TOKENS", "required": 200, "balance": 50 }
```

**Response `410`:**
```json
{ "error": "OUT_OF_STOCK" }
```

---

### `GET /api/shop/sale-events`

🌐 Public. Active time-limited sale events.

**Response `200`:**
```json
{
  "events": [
    {
      "id": "sale_weekend",
      "name": "Weekend Sale",
      "discountPercent": 30,
      "endsAt": "2026-03-02T23:59:59.000Z",
      "applicableItemIds": ["skin_alien", "lootbox_season3"]
    }
  ]
}
```

---

## 12. Subscription (Stripe)

### `POST /api/subscription/checkout`

🔒 Protected. Create a Stripe Checkout session for the Pro subscription.

**Request body:**
```json
{
  "plan": "PRO_MONTHLY",
  "successUrl": "https://battlecircles.io/profile?upgraded=1",
  "cancelUrl": "https://battlecircles.io/profile"
}
```

**Response `200`:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_live_..."
}
```

---

### `POST /api/subscription/webhook`

🌐 Public (verified via `Stripe-Signature` header). Receives Stripe events.

Handled events:
- `checkout.session.completed` → set `user.tier = PRO`, set `user.premiumUntil`
- `invoice.payment_succeeded` → renew `premiumUntil`, award monthly stipend tokens
- `customer.subscription.deleted` → revert `user.tier = FREE`

**Response `200`:** `{ "received": true }`

**Notes:** Always return `200` to Stripe even if processing fails internally — log the error and retry via a queue. Never return `5xx` to Stripe webhooks.

---

### `DELETE /api/subscription`

🔒 Protected. Cancel subscription at end of current billing period.

**Response `200`:**
```json
{
  "cancelledAt": "2026-02-27T14:00:00.000Z",
  "accessUntil": "2026-03-27T00:00:00.000Z"
}
```

---

## 13. Settings

### `GET /api/user/settings`

🔒 Protected. User's saved preferences.

**Response `200`:**
```json
{
  "menuMusic": true,
  "musicInGame": true,
  "soundEffects": true,
  "showGrid": true,
  "showDirection": true,
  "showBorder": false,
  "jellyPhysics": false,
  "maxFps": "UNLIMITED",
  "language": "en",
  "keyBindings": {
    "up":    ["ArrowUp", "w"],
    "down":  ["ArrowDown", "s"],
    "left":  ["ArrowLeft", "a"],
    "right": ["ArrowRight", "d"],
    "split": ["Space"],
    "spit":  ["ShiftLeft"]
  }
}
```

---

### `PATCH /api/user/settings`

🔒 Protected. Partial update of preferences.

**Request body** (all fields optional):
```json
{
  "menuMusic": false,
  "maxFps": "60",
  "keyBindings": {
    "split": ["Space", "e"]
  }
}
```

**Validation:**
- `maxFps`: one of `"30" | "60" | "120" | "144" | "UNLIMITED"`
- `language`: ISO 639-1 code
- `keyBindings`: each value must be an array of 1–2 valid `KeyboardEvent.code` strings

**Response `200`:** full updated settings object.

---

## 14. Internal (Server → Server)

These routes are called by the **game server** (Socket.io process) after a match ends. They are not exposed to the public internet — gated by a shared `INTERNAL_API_SECRET` header.

```
Authorization: Internal <INTERNAL_API_SECRET>
```

---

### `POST /api/internal/matches/complete`

Called by the game server when a room's status transitions to `FINISHED`.

**Request body:**
```json
{
  "roomId": "global",
  "startedAt": "2026-02-27T09:00:00.000Z",
  "endedAt": "2026-02-27T09:05:12.000Z",
  "results": [
    {
      "socketId": "abc123",
      "userId": "clx_1",
      "guestId": null,
      "placement": 1,
      "score": 3840,
      "peakSize": 142,
      "playersEaten": 4
    },
    {
      "socketId": "def456",
      "userId": null,
      "guestId": "guest_01J9...",
      "placement": 2,
      "score": 2100,
      "peakSize": 98,
      "playersEaten": 2
    }
  ]
}
```

**Response `201`:**
```json
{
  "sessionId": "session_abc",
  "rewards": [
    { "userId": "clx_1", "tokensAwarded": 50, "xpAwarded": 80, "ratingDelta": 20 },
    { "userId": null,    "tokensAwarded": 0,  "xpAwarded": 40, "ratingDelta": -15 }
  ]
}
```

**Notes:**
- Guest players earn XP tracked against their `guestId`. Tokens are held and credited when they sign up.
- The game server broadcasts the reward summary back to clients via socket after receiving this response.

---

### `POST /api/internal/presence/increment`

Called when a socket connects and joins a room.

**Request body:** `{ "count": 1 }`

**Response `200`:** `{ "online": 313 }`

---

### `POST /api/internal/presence/decrement`

Called when a socket disconnects.

**Request body:** `{ "count": 1 }`

**Response `200`:** `{ "online": 312 }`

---

## Appendix — HTTP Status Codes Used

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `204` | No Content (DELETE success) |
| `400` | Bad Request — validation error |
| `401` | Unauthorized — missing or expired JWT |
| `403` | Forbidden — authenticated but not allowed |
| `404` | Not Found |
| `409` | Conflict — duplicate action (already claimed, already referred) |
| `410` | Gone — out of stock |
| `402` | Payment Required — insufficient tokens |
| `429` | Too Many Requests — rate limited |
| `500` | Internal Server Error |

## Appendix — Rate Limits

| Route group | Limit |
|---|---|
| `POST /api/auth/*` | 10 req / min per IP |
| `GET /api/seasons/online` | 60 req / min per IP (it's a poll endpoint) |
| `POST /api/daily-claim` | 5 req / min per user |
| `POST /api/shop/*/buy` | 10 req / min per user |
| `POST /api/subscription/*` | 5 req / min per user |
| All other authenticated routes | 120 req / min per user |
| All other public routes | 30 req / min per IP |