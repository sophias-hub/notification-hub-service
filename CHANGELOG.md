# Changelog

All notable changes to **Notification Hub** (API, SDKs, and generated API/SDK docs) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This is the **canonical** product changelog for the portfolio.

## [Unreleased]

### Added

- Unified `npm run validate`: markdownlint, Vale, and Lychee (`scripts/validate.sh`). Skips API tests and docs / OpenAPI builds.
- `npm run pre-pr` (`scripts/pre-pr.sh`): local mirror of CI PR jobs (`validate` + `test-and-build-docs`); skips main-only publish.
- Shared OpenAPI example payloads in `src/openapi/examples.ts` (request bodies, path/query prefills, and every success and error response). Controllers reference them via `@Example` / `@Response`; `scripts/enrich-swagger-examples.ts` applies the same values so Swagger UI Try it out stays prefilled.

### Changed

- `npm run validate` no longer runs API tests; use `npm test` or `npm run pre-pr`.
- `POST /api/v1/templates` assigns a unique `id` (`tpl-…`); clients no longer choose the id. List (`GET /api/v1/templates`) and get-by-id (`GET /api/v1/templates/{id}`) are unchanged. TypeScript, Java, and Python SDKs updated to match.

### Fixed

- `docs:finalize` no longer fails in CI: publish-target README templates under `docs/templates/` are tracked (previously ignored by `docs/*`).
- Empty or whitespace-only template `name` now returns `422 INVALID_TEMPLATE_BODY` instead of `400 MISSING_FIELDS`.
- `POST /api/v1/send` rejects channel/template mismatches (`422 INVALID_TEMPLATE_BODY`).
- Webhook deliveries only record for subscriptions that include `record.delivered`; invalid `events` values are rejected.
- Deleting a webhook also clears its simulated delivery history.
- `GET /api/v1/records?status=` rejects unsupported status values with `422`.
- Deprecated SDK `send()` helpers no longer target a missing `legacy-raw-template` id; they use the seeded template for the requested channel.
- Stable `500 INTERNAL_ERROR` JSON for unexpected failures; stricter optional-field typing under `exactOptionalPropertyTypes`.

## [1.0.0] - 2026-07-13

### Added

- Mock Notification Hub REST API: templates, preferences, send, delivery **records**, webhooks, and health/readiness.
- Typed error codes (`UNAUTHORIZED`, `MISSING_FIELDS`, `CHANNEL_OPTED_OUT`, not-found/conflict/validation, `RATE_LIMITED`).
- Demo auth via `X-API-Key: secure-token-123`.
- HTTP SDKs for TypeScript, Java, and Python.
- OpenAPI generation (tsoa) and published Swagger UI (`docs-api`).
- Generated SDK reference sites (`docs-sdk`) with provenance banners.
- CI publish from `main` to `docs-api` and `docs-sdk` (latest-only).

### Changed

- Tracking resource naming standardized on **record** / `recordId` (not message).

[Unreleased]: https://github.com/sophias-hub/notification-hub-service/commits/main
[1.0.0]: https://github.com/sophias-hub/notification-hub-service/releases
