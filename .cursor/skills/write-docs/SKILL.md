---
name: write-docs
description: >-
  Writes exhaustive API and SDK reference documentation for notification-hub-service
  (tsoa/OpenAPI, TypeScript JSDoc, Java Javadoc, Python docstrings, SDK READMEs).
  Covers every exposed endpoint, class, method, and field with human-readable full
  sentences, verb-led field descriptions, monospace formatting, paired request/response
  examples, and error troubleshooting text. Excludes Antora how-to narratives. Use when
  documenting the API or SDKs, filling OpenAPI/SDK gaps, updating reference docs after
  endpoint changes, or when the user asks for complete API/SDK docs.
---

# Write API and SDK docs

Produce **complete reference documentation** for everything this repo publishes to
`docs-api` and `docs-sdk`. Readers should finish with no open questions about
contracts, formats, limits, or how to recover from errors.

## Out of scope (Antora owns this)

Do **not** write guided **happy-path narratives** or how-to step lists here. Those live in the sibling Antora hub
(`docs/` → https://sophias-hub.github.io/docs/), including:

- Learning path: create template → retrieve → set preference → send (and optional status check)
- How-tos for auth, templates, preferences, send, status, webhooks, troubleshoot

**Still required here:** OpenAPI **paired request/response examples** and **error troubleshooting** so Swagger Try it out and Antora RapiDoc Mini work. Reference docs are the example source of truth—not a second copy of tutorial prose.

Also out of scope: Antora AsciiDoc, tutorials, or RapiDoc markup inside this repo.

## Sources of truth

| Concern | Read / update |
|---------|----------------|
| Runtime behavior | `src/server.ts`, `src/store.ts`, `src/errors.ts` |
| OpenAPI | `src/controllers/notificationController.ts` → `npx tsoa spec` |
| TypeScript SDK | `sdks/typescript/client.ts` (+ README) |
| Java SDK | `sdks/java/.../*.java` (+ README) |
| Python SDK | `sdks/python/src/notification_hub/client.py` (+ README) |

Behavior must match runtime. If docs and runtime disagree, **fix docs to match runtime** unless the user asked to change behavior.

## Voice and readability

- Prefer **full sentences** that explain what something is and why it matters.
- Simple yet technical; prefer domain terms (`template`, `record`, `channel`, `preference`).
- Unambiguous: required vs optional, formats, enums, defaults, limits, error codes.
- One term for one thing: **record** / `recordId` (never message/messageId for send tracking).
- No fluff, analogies, or “in this section we will…”.

### Verb-led fields that change behavior

When a field **controls or changes** the result (inputs, flags, filters, options), start the description with a **verb**, for example:

- Defines how…
- Specifies which…
- Sets whether…
- Limits…
- Replaces…

Passive identifiers on read-only responses may start with Identifies…, Reports…, Contains…, or When….

### Monospace formatting

In descriptions (Markdown surfaces: OpenAPI, TypeDoc, pdoc), wrap the following in backticks:

- Field and property names (`recipient`, `templateId`, `recordId`)
- Literal values and enums (`email`, `delivered`, `success`)
- Error codes (`TEMPLATE_NOT_FOUND`, `RATE_LIMITED`)
- Header names and demo secrets (`X-API-Key`, `secure-token-123`)
- Placeholder syntax (`{{name}}`)

Never leave endpoint names as bare prose (“send”).

### Hyperlinks for HTTP operations

When you mention another API operation in prose (troubleshooting, NOTES, cross-refs), make it a **Markdown link** (not backticks alone):

```
[`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification)
```

Rules:

- Link text = full operation `` `METHOD /api/v1/...` `` (monospace inside the link).
- Target = published Swagger UI deep link: `https://sophias-hub.github.io/docs-api/#/{Tag}/{operationId}` (for example `#/Send/SendNotification`).
- `operationId` and `@Tags` come from tsoa. Confirm in `docs/api/swagger.json` after `npx tsoa spec`.
- Tags (order in `tsoa.json`): `Health`, `Templates`, `Send`, `Records`, `Preferences`, `Webhooks`.
- Use these links in OpenAPI descriptions, TypeDoc JSDoc, and pdoc docstrings.
- Java: `<a href="https://sophias-hub.github.io/docs-api/#/Send/SendNotification"><code>POST /api/v1/send</code></a>`.
- Do **not** invent relative-only hashes for hub AsciiDoc here; Antora pages already point at `docs-api` separately.

Common map (`#/{Tag}/{operationId}`):

| Operation | Tag | operationId |
|-----------|-----|-------------|
| `GET /api/v1/health/ready` | `Health` | `GetReady` |
| `GET /api/v1/templates` | `Templates` | `GetTemplates` |
| `POST /api/v1/templates` | `Templates` | `CreateTemplate` |
| `GET /api/v1/templates/{id}` | `Templates` | `GetTemplate` |
| `PUT /api/v1/templates/{id}` | `Templates` | `UpdateTemplate` |
| `PATCH /api/v1/templates/{id}` | `Templates` | `PatchTemplate` |
| `DELETE /api/v1/templates/{id}` | `Templates` | `DeleteTemplate` |
| `POST /api/v1/send` | `Send` | `SendNotification` |
| `GET /api/v1/records` | `Records` | `ListRecords` |
| `GET /api/v1/records/{recordId}` | `Records` | `GetRecord` |
| `DELETE /api/v1/records/{recordId}` | `Records` | `DeleteRecord` |
| `GET /api/v1/preferences/{recipient}` | `Preferences` | `GetPreferences` |
| `PUT /api/v1/preferences/{recipient}` | `Preferences` | `SetPreferences` |
| `PATCH /api/v1/preferences/{recipient}` | `Preferences` | `PatchPreferences` |
| `DELETE /api/v1/preferences/{recipient}` | `Preferences` | `ResetPreferences` |
| `POST /api/v1/unsubscribe` | `Preferences` | `Unsubscribe` |
| `POST /api/v1/webhooks` | `Webhooks` | `CreateWebhook` |
| `GET /api/v1/webhooks` | `Webhooks` | `ListWebhooks` |
| `GET /api/v1/webhooks/deliveries` | `Webhooks` | `ListWebhookDeliveries` |
| `GET /api/v1/webhooks/{id}` | `Webhooks` | `GetWebhook` |
| `DELETE /api/v1/webhooks/{id}` | `Webhooks` | `DeleteWebhook` |

Java Javadoc: use `{@code …}` for non-link monospace; use `<strong>NOTE:</strong>` instead of `**NOTE**:`; use `<a href="…"><code>…</code></a>` for operations.

### Field description + NOTE

Split each field (and similar params) into:

1. **Description** — one or two sentences on what the field is / does (verb-led when it alters results).
2. **NOTE** — extra constraints, defaults, and scenario outcomes (errors, validation, side effects). Prefer hyperlinked operations inside NOTES when telling the reader which call to make next.

Markdown (OpenAPI / TypeDoc / pdoc):

```
/**
 * Specifies who should receive the notification.
 *
 * **NOTE**: Use an email address for `email`, a phone number for `sms`, or a device token for `push`.
 */
```

### Line breaks (CommonMark)

OpenAPI descriptions are CommonMark. A single newline is a soft break and may render as a space.

- Separate the description from `**NOTE**:` with a **blank JSDoc line** (emits `\n\n` → new paragraph).
- For a hard line break inside one paragraph, end the line with `\` (or two trailing spaces). Prefer `\` over trailing spaces in source.
- Do **not** rely on a lone `\n` between sentences for visible breaks in Swagger / RapiDoc.

## Do not repeat the schema

Prose must **not** restate what the typed schema already shows.

- Don't rephrase type, name, or nullability already visible in the signature/OpenAPI schema.
- Don't duplicate the full request/response shape in narrative when properties are already documented on the schema.
- **Do** add what the schema cannot say: meaning, allowed values beyond the type, formats, defaults, limits, side effects, troubleshooting, and **paired Try-it-out examples**.

## Progress checklist

Copy and track:

```
Document Progress:
- [ ] Inventory exposed surface (endpoints + SDK public API)
- [ ] Document each endpoint in tsoa (behavior, verb-led fields, monospace, paired examples, error troubleshooting)
- [ ] Document TypeScript types/methods (JSDoc)
- [ ] Document Java types/methods (Javadoc)
- [ ] Document Python types/methods (docstrings)
- [ ] SDK READMEs: construct client + link hub + link generated ref (no learning-path walkthrough)
- [ ] Regen OpenAPI (+ SDK docs if asked)
- [ ] Spot-check: paired request/response examples; every error has troubleshooting; verb-led altering fields; monospace; HTTP ops are hyperlinked to docs-api; description + NOTE with paragraph breaks; no schema echo; no Antora narrative duplication
```

## Step 1 — Inventory

From runtime + controller + three SDKs, list:

1. Every HTTP route (method + path)
2. Every public SDK class, method, exported type/field
3. Every stable error `code` returned

Do not document private helpers or generated trees (`docs/sdk/`, `docs/api-site/`) by hand.

## Step 2 — Endpoint docs (tsoa)

For **each** route in `notificationController.ts`:

1. `@summary` — short action phrase.
2. Method JSDoc — what it does; auth if not obvious; notable limits. Full sentences. Do not paste the body schema. Do not narrate the Antora learning path.
3. Request/response interfaces — each property in full sentences; **verb-led** when the field alters behavior; **monospace** for names/values/codes.
4. `@Response` for each error the runtime can return on that route.
5. **Error troubleshooting (required):** every error `@Response` description must name the `code` and explain **how to fix or investigate** (what to check, which call to retry, which header/field to correct). Do not stop at “not found”.
6. **Paired examples (required for Swagger / RapiDoc Try it out):**
   - Every request body (or meaningful query/path demo) that has an example **must** also have a matching **success response example** for that same happy path (use interface `@example` for the request and `@Example` / success response examples for the consecutive response).
   - Mutating routes (`POST`/`PUT`/`PATCH`, including `/send` and `/unsubscribe`): at least one complete valid success request **and** the response that follows from it.
   - Add failure/edge response examples when they clarify the contract (`MISSING_FIELDS`, `CHANNEL_OPTED_OUT`, `TEMPLATE_IN_USE`, `RATE_LIMITED`, not-found, and so on), each with troubleshooting text in the `@Response` description.
   - Use tsoa/OpenAPI example mechanisms so generated `swagger.json` exposes them—Antora RapiDoc Mini embeds consume the published spec.

Document these facts wherever they apply:

| Topic | State explicitly |
|-------|------------------|
| Auth | `X-API-Key` required (except `GET /health`); demo value `secure-token-123` |
| Channels | `email` \| `sms` \| `push` only |
| Template id | lowercase letters, numbers, hyphens |
| Preferences | booleans; default all `true` until set |
| Send rate limit | 10 sends / 60s → `429` `RATE_LIMITED` + `Retry-After` |
| Records | send receipt; statuses `queued` \| `delivered` \| `failed` |
| Webhooks | URL must be `http://` or `https://`; deliveries are simulated (no outbound HTTP) |
| Persistence | in-memory; lost on restart |
| Delete template | `409` `TEMPLATE_IN_USE` if referenced by records |

### Error description pattern

```
`CODE` — What happened in one sentence. How to troubleshoot: concrete next check or fix.
```

Example: `` `TEMPLATE_NOT_FOUND` — No template matched this `id`. List templates with [`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates), or create the template before retrying. ``

### Payload example rule

- **Must:** ship a request example and the **consecutive** success response example for every documented write (and other bodies with examples).
- **Must not:** write Antora-style step narratives around those examples in this repo.

## Step 3 — SDK docs (all three languages)

Apply the same voice: full sentences, verb-led altering fields/params, monospace for code pieces, and mention recoverable error codes with a short fix hint where the method throws.

For each public type and method:

- **Class** — role of the client (base URL, API key).
- **Method** — maps to which HTTP call; parameter constraints not already in the type; return meaning; thrown errors with brief troubleshooting.
- **Fields** — meaning and constraints in full sentences—not a restatement of the declared type.

Keep the three SDKs aligned (same operations; Python snake_case methods, camelCase JSON).

### README minimum (each language)

1. Construct client with key + base URL (minimal snippet only).
2. Link guided happy path → https://sophias-hub.github.io/docs/ (Antora).
3. Link full reference → https://sophias-hub.github.io/docs-sdk/ (and language subpath).

Do **not** paste the create → retrieve → prefer → send learning path into READMEs.

## Step 4 — Regenerate

```bash
npx tsoa spec
npx swagger-cli validate docs/api/swagger.json
```

If the user asked to refresh published-looking SDK HTML locally:

```bash
npm run docs:sdk
```

Do **not** commit or push unless asked.

## Step 5 — Exhaustiveness gate

Before finishing, confirm:

- [ ] Every `/api/v1/*` route in `server.ts` appears in the tsoa controller with docs  
- [ ] Every public SDK method has a description  
- [ ] Every request/response field used in those methods is described (meaning/constraints, not type echo)  
- [ ] Altering fields/params start with a verb; monospace used for names, values, and codes  
- [ ] HTTP operations mentioned in prose are hyperlinked to `docs-api` (`#/default/{operationId}`)  
- [ ] Field extras use `**NOTE**:` after a blank-line paragraph break  
- [ ] Every error `@Response` includes troubleshooting guidance  
- [ ] Every request payload example has a consecutive success response example  
- [ ] Error codes used in runtime are named in OpenAPI `@Response` or field docs  
- [ ] No prose merely repeats the schema  
- [ ] No Antora how-to / learning-path narrative duplicated here  

## Anti-patterns

- Vague text (“handles notifications”, “returns data”)
- Fragment labels instead of full sentences (“Format: `^[a-z0-9-]+$`” alone)
- Altering fields that do not start with a verb
- Bare error labels without how to fix or investigate
- Request examples without a matching success response example
- Missing backticks around field names, codes, and literals
- Bare endpoint prose (“call send”) or monospace-only ops without a docs-api hyperlink when cross-referencing
- Relying on a single newline for a visible break in OpenAPI (use blank line or `\`)
- Restating types/names already in the schema (“`id` is a string”)
- Omitting Try-it-out examples because “Antora covers the happy path”
- Guided how-to walkthroughs in this repo (belongs in Antora; examples stay in OpenAPI)
- Leaving error/edge contracts undocumented
- Leaving optional fields undescribed
- SDK docs that omit which endpoint is called
- Writing Antora tutorial content into this repo
