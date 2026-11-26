# Local Setup — Talaro

## Prerequisites (hard requirements)
- Node.js **22+** (Node 20 fails at `bun create mercur-app` because execa@10 uses `Set.prototype.union()`)
- Bun **1.4.5** (or compatible 1.3+)
- PostgreSQL **14+** (verified on 17.12 via Homebrew)

Pin Node so future contributors and CI do not regress:
- Create `.nvmrc` containing: `22`
- Add to root `package.json`: `"engines": { "node": ">=22.0.0" }`
- Add a README line: "Requires Node 22+ (Node 20 fails at `bun create mercur-app`)."

## Install & run
```bash
bun install
bun run dev                    # API: http://localhost:9000
```

## Verify
```bash
curl -i http://localhost:9000/health       # expect HTTP/1.1 200 OK / OK
curl -I http://localhost:9000/dashboard    # expect 200 or redirect — NOT 403 with "Server: AirTunes"
curl -I http://localhost:7002              # admin Vite dev server (should NOT show AirTunes)
```

## Admin & Vendor access
- Admin invite: `http://localhost:9000/dashboard/invite` (set password for `admin@talaro.local`)
- Vendor panel: `http://localhost:9000/seller` (demo: `seller@talaro.local` / `supersecret`)
- Auth endpoints: `/auth/seller/emailpass`, `/auth/member/emailpass`

## macOS port conflict — AirPlay Receiver on 7000 (and 5000)
macOS ControlCenter (AirPlay Receiver) binds TCP 7000 and 5000 by default. Medusa proxies `/dashboard` to the admin Vite dev server, so if Vite runs on 7000 the proxy hits AirTunes and returns:

```text
HTTP/1.1 403 Forbidden
Server: AirTunes/950.7.1
```

Confirm with:
```bash
lsof -i :7000
curl -I "http://[::1]:7000"
```

Fix (already applied):
- `apps/admin/package.json` → `"dev": "vite --port 7002"`
- `medusa-config.ts` → `viteDevServerPort: 7002`, `viteDevServerHost: '127.0.0.1'`
- `packages/api/.env` → `ADMIN_CORS` and `AUTH_CORS` include `http://localhost:7002`

Do NOT disable AirPlay system-wide. Move the dev server instead. Watch port 5000 for the same class of collision.

## Notes
- Any doc or script referencing port 7000 for the admin panel is stale. Use 7002.
- If `bun install` stalls on an idle registry socket, restart it — tarballs are cached.
- Sellers get one auto-seeded shipping profile on creation. The /vendor/shipping-profiles route stays disabled; offers reference the profile by ID internally. Do not re-enable the route.
- New sellers are auto-linked to the store's default region (INR preferred). If no INR region exists, offers will fail with a region-prices error — the store owner must create an INR region first.
- POST /vendor/offers requires variant_id (not product_id) and at least 1 price and 1 inventory item.
- seller_invite.role currently unused by the gate middleware. Reserved for Prompt 9 (seller-generated invites). Do not rely on it for access control until Prompt 9 lands.
- seller_invite.request_id is NULL for legacy invites, triggering an expected console.warn during consumption until legacy invites naturally expire (14 days).
- In-memory invite mutex is process-local; swap consumeInviteStep to atomic UPDATE ... WHERE use_count < max_uses RETURNING * upon multi-instance horizontal deployment.
