---
name: validate-and-fix
description: >-
  Runs validation (markdownlint + Vale + Lychee via npm run validate) in
  notification-hub-service, fixes failures, and re-runs until clean. Does not
  run API tests or build docs / regenerate OpenAPI. Use when the user asks to
  validate, fix Vale/Lychee/markdownlint errors, lint Markdown, or run checks
  before commit or push in this repo. For a full pre-PR gate (tests + docs),
  use npm run pre-pr.
---

# Validate and fix (notification-hub-service)

Close the CI validation loop locally before commit or push. Use this repo’s
existing `npm run validate` only—don't invent a parallel validator.

**Scope:** `scripts/validate.sh` (Markdown only — no API tests, no docs/OpenAPI
builds). Vale/markdownlint skip `node_modules/`, `docs/sdk/`, and
`docs/api-site/`. For the full CI mirror before a PR, use `npm run pre-pr`.

## Workflow

Copy and track:

```
Validate Progress:
- [ ] cd to this repo root
- [ ] Run npm run validate
- [ ] Fix failures (if any)
- [ ] Re-run until clean (max 3 fix cycles)
- [ ] Report result (do not commit/push unless asked)
```

1. `cd` to the `notification-hub-service` repo root.
2. Run: `npm run validate`
3. If exit 0 → report clean; say ready to commit/push. **Stop.**
4. If failure → parse output, fix files, go to step 2.
5. After **3** fix cycles still failing → stop and summarize remaining errors.
6. **Never** commit or push unless the user explicitly asked.

## Parse and fix failures

### markdownlint

Typical line: `path:line MD0xx Rule / message`

- Fix heading structure, blank lines, list markers, and fence formatting.
- Config is `.markdownlint.json`. Don't weaken rules unless the repo already
  documents an intentional exception.

### Vale

Typical line: `path:line:col  error  message  Rule.Name`

- Apply the rule’s suggested wording when present (for example contractions, dash spacing).
- Keep meaning; change only what the rule requires.
- Common Microsoft rules:
  - `Microsoft.Dashes`—em dash with **no** spaces: `word—word`
  - `Microsoft.Contractions`—prefer `don't`, `aren't`, `doesn't`, etc.
- Fix every reported location in the cycle when safe; then re-run.

### Lychee

- Broken URL → correct the link target in the source file when the destination is wrong or moved.
- Update `.lychee.toml` **only** for intentionally excluded URLs; keep config consistent with existing excludes. Prefer fixing the link over excluding.

### Missing tools

If validate exits because `vale` or `lychee` is missing, print the install hint from the script output (typically `brew install vale`, `brew install lychee`). Don't invent a custom installer or skip validation.

## Hard rules

- Prefer Vale’s suggested wording over paraphrasing.
- Don't silence failures (no deleting checks, no `--no-verify`, no weakening CI).
- Don't edit generated trees (`docs/sdk/`, `docs/api-site/`) to “pass” lint.
- Don't add a new validate script; call `npm run validate` only.
- Don't run the Antora `docs` repo validate from this skill.
