# ARCHIVE SWIPE

Japanese archive clothing / visual-curation inspired Pinterest swipe app. Includes a browser demo, 11 themes (archive + 10 variants), swipe/keyboard actions, gentle synthesized feedback sounds, YouTube playlist embeds, local keep/pass history, and an optional Pinterest OAuth connection.

## Run the demo

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Pinterest credentials the app works in demo mode.

## Enable Pinterest account login

1. Register an app in the [Pinterest Developer Platform](https://developers.pinterest.com/).
2. Configure this exact redirect URL in your app settings:

   `http://localhost:3000/auth/pinterest/callback`

3. Copy `.env.example` to `.env` and fill in `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET`, and a long random `SESSION_SECRET`.
4. Restart the app and select **CONNECT PINTEREST**.
5. Approve the requested scopes: `user_accounts:read`, `boards:read`, `boards:write`, `pins:read`, `pins:write`.

The browser is redirected to Pinterest's own authorization page. The client secret and access/refresh tokens stay on the server; the user never pastes a token into the app.

## What the Pinterest integration can and cannot do

- It can read the connected account's boards and pins using Pinterest API v5.
- It can save an eligible Pin to a board using the Save Pin endpoint after the user presses Keep.
- Pinterest's documented `GET /pins` endpoint returns Pins owned by the authenticated account. It is **not** the personalized home-feed endpoint. Therefore this project does not scrape Pinterest's website or pretend its sample Discover deck is your actual algorithmic home feed.
- The demo Discover stack is locally curated sample imagery. The account stack shows Pins returned by the official API. For public recommendations from outside the account, Pinterest API access and permitted discovery endpoints would need to be separately confirmed for the specific app access tier.

## Notes before deploying publicly

- The built-in Express session store is in-memory for local development. Use a persistent session store (such as Redis or a database-backed store) in production.
- Serve over HTTPS in production and set `NODE_ENV=production`.
- Store secrets in the hosting provider's secret manager, not in source control.
- Request only the minimum scopes needed. Remove write scopes if you only want read-only browsing.
- YouTube playback is embedded after the user selects a track. Browsers generally block sound autoplay before a user gesture.
