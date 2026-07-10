# Deployment Plan (for later)

This document captures what to change when hosting the Notification Hub Service live. Most changes are **configuration**, not a rewrite.

## Current local setup

| Service | URL | Command |
|---------|-----|---------|
| API | `http://localhost:3000` | `npm start` |
| Swagger UI | `http://localhost:8080/docs` | `npm run docs:api` |

The docs server proxies `/api/*` to the API server. This same-origin proxy pattern works well in production too.

---

## Required changes for live hosting

### 1. API key (required)

**Current state:** Hardcoded as `secure-token-123` in:
- `src/server.ts`
- `src/authentication.ts`

**Production change:** Move to an environment variable, for example `API_KEY`, and read from `process.env`.

```bash
API_KEY=your-production-secret
```

Update tests and docs to reference the env-based key instead of the hardcoded value.

### 2. Docs server URLs (required if hosting Swagger UI)

**Current state:** `scripts/swagger-docs.ts` defaults to:
- Docs server: `localhost:8080`
- API proxy target: `http://localhost:3000`

**Production change:** Set `API_BASE_URL` to the public API URL:

```bash
API_BASE_URL=https://api.yourdomain.com npm run docs:api
```

Also update the Swagger spec host/servers to use the real docs domain (for example, `https://docs.yourdomain.com`) instead of `localhost:8080`.

### 3. CORS (recommended)

**Current state:** `origin: true` in `src/server.ts`—allows any origin.

**Production change:** Restrict to known frontend/docs domains:

```typescript
cors({
  origin: ['https://docs.yourdomain.com', 'https://yourdomain.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
})
```

Or drive allowed origins from an env var (for example, `CORS_ORIGINS`).

---

## What you likely won't need to change

- **API routes**—`/api/v1/templates` and `/api/v1/send` can stay as-is.
- **Proxy pattern**—Swagger UI calling same-origin `/api/*` on the docs server, which forwards to the real API, is a solid production pattern.
- **Docker setup**—Mostly fine; pass env vars at runtime via `docker-compose.yml` or your hosting platform.

---

## Typical live environment variables

| Service | Variables |
|---------|-----------|
| API | `PORT`, `API_KEY` |
| Docs UI | `API_BASE_URL=https://api.yourdomain.com`, plus public docs URL in Swagger spec |
| Optional | `CORS_ORIGINS` (comma-separated list of allowed origins) |

---

## Suggested next step (when ready)

Make the repo deployment-ready by centralizing config:

1. Add `API_KEY` env var (replace hardcoded key in `server.ts` and `authentication.ts`)
2. Add `DOCS_BASE_URL` / `API_BASE_URL` env vars for Swagger host configuration
3. Add `CORS_ORIGINS` env var for production CORS restriction
4. Document env vars in README and `.env.example`

---

## Notes

- Portfolio/demo use: current hardcoded values are fine for local development.
- Before going live: never commit real production secrets; use platform env var injection (Railway, Render, Fly.io, etc.).
