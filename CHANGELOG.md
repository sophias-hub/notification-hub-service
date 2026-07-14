# Changelog

All notable changes to **Notification Hub** (API, SDKs, and generated API/SDK docs) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This is the **canonical** product changelog for the portfolio. Don't maintain parallel changelogs in `docs-api` or `docs-sdk` (publish targets). The Antora hub (`docs`) links here for product history; it doesn't mirror API release notes.

Published GitHub Releases (when cut) should match the versioned sections below.

## [Unreleased]

### Added

- (none yet)

### Changed

- (none yet)

### Fixed

- (none yet)

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
