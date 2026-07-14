# Notification Hub Service—agent overview

This file is the **source of truth for coding agents** working in `notification-hub-service`.
Read it before changing API behavior, SDKs, OpenAPI, or CI/docs publishing.

Related guide repos (separate git remotes in the portfolio workspace):

- Antora hub writing rules → sibling `docs/AGENTS.md` (Diátaxis / AsciiDoc)
- Published sites → `docs-api`, `docs-sdk` (GitHub Pages; **not** edited by hand)
- **Canonical product changelog** → [`CHANGELOG.md`](./CHANGELOG.md) (Keep a Changelog). Optional GitHub Release for notable versions. No changelogs in `docs-api` / `docs-sdk`.

---

## What this project is

**Notification Hub** is a **portfolio mock API** that simulates a notification dispatch product.

- Accepts authenticated send requests (email / SMS / push)
- Manages **templates**, **recipient preferences**, **delivery records**, and **webhooks**
- Returns tracking ids and typed errors suitable for tutorials and try-it-out
- Ships thin HTTP SDKs in **TypeScript**, **Java**, and **Python**
- Generates **OpenAPI** (Swagger) and **SDK reference** sites published by CI

**Not production.** No real email/SMS/push providers, no durable database, no real outbound webhook HTTP. In-memory state resets on process restart.

Demo auth (hardcoded everywhere): header `X-API-Key: secure-token-123`.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js, TypeScript (ESM, `"type": "module"`) |
| HTTP | Express 5 (`src/server.ts`) |
| OpenAPI | **tsoa** → `docs/api/swagger.json` (Swagger 2) |
| Tests | Jest + Supertest (`src/server.test.ts`) |
| SDKs | Hand-maintained clients under `sdks/{typescript,java,python}/` |
| SDK docs | TypeDoc / Javadoc / pdoc → `docs/sdk/` |
| API docs UI | Swagger UI (`docs:api`, `docs:api:site`) |
| Containers | `Dockerfile`, `docker-compose.yml` |
| Hosting blueprint | `render.yaml` (`GET /health`) |
| Validation | `npm run validate` (markdownlint, Vale, Lychee); full pre-PR: `npm run pre-pr` |

---

## Architecture (critical)

```text
Clients / SDKs / Swagger Try it out
        │
        ▼
 src/server.ts          ← RUNTIME (source of truth for behavior)
        │
        ├── src/store.ts     in-memory Maps (templates, records, prefs, webhooks)
        └── src/errors.ts    stable ApiError shape + codes

 src/controllers/*.ts   ← DOCUMENTATION ONLY (tsoa decorators → OpenAPI)
 src/authentication.ts  ← tsoa security helper (not Express middleware)
```

**Dual surface:** Express routes implement the live API. TSOA controllers aren't mounted; they exist so `tsoa spec` can emit OpenAPI. Keep **behavior and schemas in sync** across:

1. `src/server.ts` + `store.ts` + `errors.ts`
2. `src/controllers/notificationController.ts`
3. All three SDK clients
4. Antora hub embeds (sibling `docs` repo) that point at published OpenAPI

There is **no** generated `routes.ts` wiring—don't assume tsoa routes run at runtime.

---

## Functionality

### Public

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness (no auth) |

### Authenticated (`X-API-Key`)

**Templates (CRUD)**

| Method | Path |
|--------|------|
| `GET` | `/api/v1/templates` |
| `GET` | `/api/v1/templates/{id}` |
| `POST` | `/api/v1/templates` → `201` (service assigns `id`; body needs `name` + `channel`) |
| `PUT` / `PATCH` | `/api/v1/templates/{id}` |
| `DELETE` | `/api/v1/templates/{id}` → `204` (`409 TEMPLATE_IN_USE` if referenced by records) |

**Send + delivery records** (records = send history / receipts—**not** chat messages)

| Method | Path |
|--------|------|
| `POST` | `/api/v1/send` → `{ status, recordId, processedAt }` |
| `GET` | `/api/v1/records` (`?recipient=` `&status=`) |
| `GET` | `/api/v1/records/{recordId}` |
| `DELETE` | `/api/v1/records/{recordId}` → `204` |

Statuses: `queued` \| `delivered` \| `failed` (demo flips to `delivered` quickly).

**Preferences / consent**

| Method | Path |
|--------|------|
| `GET` / `PUT` / `PATCH` / `DELETE` | `/api/v1/preferences/{recipient}` |
| `POST` | `/api/v1/unsubscribe` `{ recipient, channel }` |

Defaults: all channels allowed until set. Opt-out blocks send with `403 CHANNEL_OPTED_OUT`.

**Webhooks (simulated)**

| Method | Path |
|--------|------|
| `POST` / `GET` | `/api/v1/webhooks` |
| `GET` / `DELETE` | `/api/v1/webhooks/{id}` |
| `GET` | `/api/v1/webhooks/deliveries` |

Registering a URL doesn't call it. Sends append fake delivery attempts for demos.

**Ops**

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/health/ready` | Readiness + store counts |

**Rate limit:** 10 sends / 60s window → `429 RATE_LIMITED` + `Retry-After`.

### Error shape

```json
{
  "error": "NotFound",
  "code": "RECORD_NOT_FOUND",
  "message": "No record with id 'rec-…'.",
  "details": { "id": "rec-…" }
}
```

Stable codes include: `UNAUTHORIZED`, `MISSING_FIELDS`, `CHANNEL_OPTED_OUT`, `TEMPLATE_NOT_FOUND`, `RECORD_NOT_FOUND`, `WEBHOOK_NOT_FOUND`, `TEMPLATE_IN_USE`, `INVALID_CHANNEL`, `INVALID_TEMPLATE_BODY`, `RATE_LIMITED`.

Channels: `email` \| `sms` \| `push` only.

---

## Key source files

| Path | Role |
|------|------|
| `src/server.ts` | Express app, auth middleware, all live routes |
| `src/store.ts` | In-memory domain store + seed templates |
| `src/errors.ts` | `ApiError` / `Errors.*` helpers |
| `src/controllers/notificationController.ts` | OpenAPI metadata (tsoa) |
| `src/authentication.ts` | tsoa `ApiKeyAuth` |
| `src/server.test.ts` | Integration tests (reset store in `beforeEach`) |
| `tsoa.json` | Spec output → `docs/api/` |
| `sdks/typescript/client.ts` | TS SDK |
| `sdks/java/.../NotificationClient.java` | Java SDK |
| `sdks/python/src/notification_hub/client.py` | Python SDK |
| `scripts/build-swagger-ui-static.ts` | Static API site |
| `scripts/build-sdk-docs.sh` | SDK docs build |
| `.github/workflows/ci.yml` | Validate → test → build docs → publish on `main` |

---

## SDKs

Hand-written thin HTTP clients (not OpenAPI-codegen). Mirror the REST surface.

| Language | Entry | Notes |
|----------|-------|-------|
| TypeScript | `sdks/typescript/client.ts` | `fetch`; TypeDoc |
| Java | `sdks/java/.../NotificationClient.java` | `java.net.http`; Jackson; Javadoc |
| Python | `sdks/python/src/notification_hub/client.py` | stdlib `urllib`; snake_case methods |

JSON bodies use **camelCase** (`templateId`, `recordId`). Python methods use snake_case but send camelCase JSON.

Smoke scripts: `sdks/typescript/test-client.ts`, Java `SmokeTest`, `sdks/python/examples/smoke_test.py` (API must be running).

Learning-path flow to cover in smokes: **create template → retrieve → set preference → send → get record**.

---

## Docs publishing model

| Artifact | Built in this repo | Published to |
|----------|--------------------|--------------|
| OpenAPI + Swagger UI | `docs/api/`, `docs/api-site/` | https://sophias-hub.github.io/docs-api/ |
| SDK reference | `docs/sdk/` | https://sophias-hub.github.io/docs-sdk/ |
| Human guides (tutorials/how-tos) | **Not here** | https://sophias-hub.github.io/docs/ (Antora `docs` repo) |

On push to **`main`**, CI builds and deploys API + SDK sites (deploy keys / secrets). Local:

```bash
npm run validate         # markdownlint + Vale + Lychee (no tests)
npm run pre-pr           # local CI PR mirror (validate + tests + docs)
npm run docs:api:spec    # regenerate + enrich OpenAPI
npm run docs:api:site    # needs PUBLIC_API_URL for remote Try it out
npm run docs:sdk
npm run docs:finalize
```

Hub RapiDoc embeds read the **published** `docs-api` swagger URL—they stay stale until CI republishes after merge.

### Changelog (canonical here)

- Maintain [`CHANGELOG.md`](./CHANGELOG.md) (Keep a Changelog + SemVer).
- Update it in the **same change set** as user-visible API/SDK behavior.
- For notable versions, cut a matching **GitHub Release** whose notes match the changelog section.
- **Don't** add `CHANGELOG.md` to `docs-api` or `docs-sdk` (publish-only; provenance banners suffice).
- Antora hub may **link** here; it must not duplicate product release notes.

---

## Common commands

```bash
npm install
npm start                 # :3000
npm run validate          # markdownlint + Vale + Lychee (no tests)
npm run pre-pr            # local CI PR mirror (validate + tests + docs)
npm test                  # API tests
npm run test:sdk          # needs API up
npm run docs:api:spec     # regenerate OpenAPI after API/docs source changes
npm run docs:api          # spec + Swagger UI :8080
npm run docs:api:site
npm run docs:sdk
docker-compose up --build
```

---

## Conventions for agents

1. **Change runtime first** (`server.ts` / `store.ts` / `errors.ts`), then tsoa controller, then all three SDKs, then tests.
2. Prefer **stable error `code`s** over free-form strings; keep docs/hub aligned.
3. Use **`records` / `recordId`**, never revive `/messages` / `messageId` for send tracking.
4. Keep CORS methods aligned with verbs you add (`GET/POST/PUT/PATCH/DELETE`).
5. Record user-visible changes under **`## [Unreleased]`** in `CHANGELOG.md` (move into a versioned section when cutting a release).
6. Don't commit secrets, deploy private keys, or `.env` with real credentials.
7. Don't invent production features (queues, OAuth, real providers) unless explicitly asked.
8. Work on a feature branch / `working-branch`; open PRs—avoid silent pushes to `main`.
9. After API shape changes, regenerate and validate OpenAPI before finishing.
10. Guide prose lives in the **`docs`** repo; this repo owns contracts + SDK reference generation.
11. Author Markdown to markdownlint + Vale + Lychee standards (see below). Run `npm run validate` (or the `validate-and-fix` skill) before commit or push; fix failures—don't skip checks.
12. When documenting API/SDK reference surfaces, follow `.cursor/rules/api-sdk-docs.mdc` and the `write-docs` skill:

    - every exposed endpoint, class, method, and field gets a human-readable full-sentence description (no schema echo);
    - **verb-led** text for fields that alter results;
    - **monospace** for field names, literals, codes, and placeholders;
    - **hyperlink** HTTP operations to published Swagger deep links (`https://sophias-hub.github.io/docs-api/#/{Tag}/{operationId}`), for example [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification);
    - split fields into description + `**NOTE**:` (constraints/scenarios; Java: `<strong>NOTE:</strong>`);
    - CommonMark **paragraph breaks** (blank comment line) or hard breaks (`\`)—do not rely on single newlines;
    - **paired request + success response examples**;
    - every error `@Response` includes **troubleshooting**;
    - then keep tsoa + all three SDKs in sync. Antora how-tos embed via RapiDoc Mini—do not write Antora narratives here.

---

## API / SDK reference documentation

Published contracts come from **comments and tsoa metadata**, not hand-written HTML.

Example payloads (request bodies, path/query prefills, success and error responses) live in **`src/openapi/examples.ts`**. Controllers import them for `@Example` / `@Response`; after `tsoa spec`, `scripts/enrich-swagger-examples.ts` stamps the same values into `docs/api/swagger.json` so Swagger UI Try it out prefills reliably (including `$ref` bodies and path params).

| Surface | Author in | Skill / rule |
|---------|-----------|--------------|
| OpenAPI / Swagger | `src/controllers/notificationController.ts` + `src/openapi/examples.ts` | `.cursor/skills/write-docs/` |
| TypeScript SDK ref | `sdks/typescript/client.ts` | same |
| Java SDK ref | `sdks/java/.../*.java` | same |
| Python SDK ref | `sdks/python/src/notification_hub/client.py` | same |

Standards (voice, verb-led altering fields, monospace, **docs-api hyperlinks for HTTP ops**, description + NOTE, CommonMark paragraph/hard breaks, paired examples, error troubleshooting, no schema repetition, no Antora how-to prose, sync): `.cursor/rules/api-sdk-docs.mdc`  
Workflow (inventory → document → regen → exhaustiveness gate): invoke **`write-docs`**.

Required in OpenAPI for each documented write (and any body with an example):

1. A complete success **request** example (add/update in `src/openapi/examples.ts`, reference from the controller)  
2. The consecutive success **response** example that follows from it  
3. Each error response with a **payload example** plus a description naming the `code` and how to investigate or fix it  
4. Field text split into meaning + `**NOTE**:` extras, with a blank line between paragraphs so Swagger/RapiDoc render a break  
5. Cross-referenced operations as Markdown links to `https://sophias-hub.github.io/docs-api/#/{Tag}/{operationId}` (not bare or monospace-only path text)

---

## Validation (`npm run validate`)

One command runs local/CI Markdown checks (see `scripts/validate.sh`) **without tests or docs builds**:

1. markdownlint (Markdown structure)
2. Vale (Microsoft prose style on `*.md`)
3. Lychee (Markdown links)

API tests: `npm test`. Local CI PR mirror (validate + tests + OpenAPI + docs builds): `npm run pre-pr` (`scripts/pre-pr.sh`). Skips main-only publish jobs.

Generated trees `docs/sdk/` and `docs/api-site/` are excluded from Markdown checks. Use `npm run lint:md` only when you want structure lint without the rest.

### markdownlint (structure)

Config: `.markdownlint.json`.

### Vale (Microsoft style on `*.md`)

Config: `.vale.ini` (`BasedOnStyles = Microsoft`, `MinAlertLevel = error`). Disabled here: `HeadingAcronyms`, `GeneralURL`, `Terms`, `FirstPerson`.

When writing or editing Markdown:

- Prefer contractions (`don't`, `aren't`, `doesn't`) over expanded forms.
- Em dashes with **no** spaces: `word—word` (not `word — word`).
- Prefer plain English over Latin abbreviations—write "for example," not "e.g."
- Apply Vale's suggested wording when it reports an error; keep meaning.

### Lychee (links)

Config: `.lychee.toml`. All Markdown links must resolve unless excluded there.

- Prefer fixing broken URLs in source over adding excludes.
- Localhost example URLs are already excluded; don't add broad excludes to hide real failures.
- Language SDK Pages paths under `docs-sdk/{typescript,java,python}/` are excluded until first publish—don't "fix" those by inventing live pages.

### Before finishing

```bash
npm run validate   # Markdown / prose / links
npm run pre-pr     # Full checks before opening a PR
```

Or invoke the project skill `.cursor/skills/validate-and-fix/` to run validate, apply fixes, and re-run until clean.

---

## Portfolio workspace context

Parent folder may contain sibling checkouts:

| Folder | Remote | Role |
|--------|--------|------|
| `notification-hub-service/` | this repo | Mock API + SDKs + OpenAPI/SDK doc generation |
| `docs/` | Antora hub | Tutorials / how-tos / explanations |
| `docs-api/` | Pages | Published Swagger |
| `docs-sdk/` | Pages | Published SDK refs |
| `PORTFOLIO_DOCS_PLAN.md` | portfolio root | Checklist (not part of this git remote) |

---

## Out of scope (unless requested)

- Real notification providers or queues
- Persistent DB / multi-tenant auth
- Real webhook HTTP delivery
- Hand-writing full API/SDK manuals inside this repo (generated sites + hub guides instead)
