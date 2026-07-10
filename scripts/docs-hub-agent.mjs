#!/usr/bin/env node
/**
 * Diátaxis docs-hub agent: map a service code change → hub AsciiDoc page(s),
 * ask Gemini to update those pages, write results under DOCS_HUB_PATH.
 *
 * Env:
 *   GEMINI_API_KEY   (required)
 *   DOCS_HUB_PATH    path to checked-out sophias-hub/docs repo (required)
 *   COMMIT_SHA       service commit SHA
 *   COMMIT_MSG       service commit subject
 *   CHANGED_FILES    newline-separated list of changed paths (optional; else from git)
 *   SERVICE_DIFF     unified diff text (optional; else from git)
 *   GEMINI_MODEL     default gemini-2.0-flash
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DOCS_HUB_PATH = process.env.DOCS_HUB_PATH;
const COMMIT_SHA = process.env.COMMIT_SHA || "unknown";
const COMMIT_MSG = process.env.COMMIT_MSG || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is required");
  process.exit(1);
}
if (!DOCS_HUB_PATH || !fs.existsSync(DOCS_HUB_PATH)) {
  console.error("DOCS_HUB_PATH must point at a checked-out docs hub repo");
  process.exit(1);
}

const PAGES_ROOT = path.join(DOCS_HUB_PATH, "docs/modules/ROOT/pages");

/** @type {Record<string, { diataxis: string; purpose: string }>} */
const CATALOG = {
  "tutorials/first-notification.adoc": {
    diataxis: "tutorial",
    purpose: "Learning-oriented end-to-end first success path",
  },
  "how-to/authentication.adoc": {
    diataxis: "how-to",
    purpose: "Task: authenticate API requests with X-API-Key",
  },
  "how-to/send-notification.adoc": {
    diataxis: "how-to",
    purpose: "Task: send a notification",
  },
  "reference/api.adoc": {
    diataxis: "reference",
    purpose: "Lookup: API / OpenAPI / Swagger facts and links",
  },
  "reference/sdk.adoc": {
    diataxis: "reference",
    purpose: "Lookup: multi-language SDK reference links",
  },
  "reference/errors.adoc": {
    diataxis: "reference",
    purpose: "Lookup: error codes and meanings",
  },
  "explanation/how-docs-stay-correct.adoc": {
    diataxis: "explanation",
    purpose: "Understanding: docs-as-code pipeline and agent PR policy",
  },
  "operations/configuration.adoc": {
    diataxis: "operations",
    purpose: "Ops: configuration and environment",
  },
  "operations/deployment.adoc": {
    diataxis: "operations",
    purpose: "Ops: deployment and hosting",
  },
};

/**
 * Rule-based Diátaxis router: changed service paths → candidate hub pages.
 * @param {string[]} files
 * @returns {string[]}
 */
function routePages(files) {
  const selected = new Set();
  const joined = files.join("\n");

  const add = (...pages) => pages.forEach((p) => selected.add(p));

  for (const f of files) {
    if (/^sdks\//.test(f) || /typedoc|javadoc|pdoc/i.test(f)) {
      add("reference/sdk.adoc");
    }
    if (
      /^src\/controllers\//.test(f) ||
      /tsoa|swagger|openapi/i.test(f) ||
      f === "src/server.ts"
    ) {
      add("reference/api.adoc");
    }
    if (/error|status|401|400|404/i.test(f) || /errors/i.test(joined)) {
      add("reference/errors.adoc");
    }
    if (/authentication|apiKey|api-key|X-API-Key/i.test(f) || /authentication\.ts/.test(f)) {
      add("how-to/authentication.adoc");
    }
    if (/notificationController|send|template/i.test(f)) {
      add("how-to/send-notification.adoc", "tutorials/first-notification.adoc");
    }
    if (/docker|render|deploy|compose/i.test(f)) {
      add("operations/deployment.adoc");
    }
    if (/\.env|config|PUBLIC_API_URL/i.test(f)) {
      add("operations/configuration.adoc");
    }
    if (/^\.github\/|docs:|finalize-docs|provenance/i.test(f)) {
      add("explanation/how-docs-stay-correct.adoc");
    }
  }

  // Fallback: API-ish change → reference/api
  if (selected.size === 0 && files.some((f) => /^src\//.test(f))) {
    add("reference/api.adoc");
  }

  return [...selected].filter((p) => CATALOG[p]);
}

function git(args, opts = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    cwd: opts.cwd || process.cwd(),
    maxBuffer: 20 * 1024 * 1024,
  }).trim();
}

function getChangedFiles() {
  if (process.env.CHANGED_FILES?.trim()) {
    return process.env.CHANGED_FILES.trim().split(/\r?\n/).filter(Boolean);
  }
  try {
    const out = git(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]);
    return out ? out.split(/\r?\n/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getDiff() {
  if (process.env.SERVICE_DIFF) return process.env.SERVICE_DIFF;
  try {
    return git(["show", "--format=", "--unified=3", "HEAD"]);
  } catch {
    return "";
  }
}

/** Code-change gate: ignore pure docs/CI-meta commits when no product paths. */
function isCodeChange(files) {
  const code = files.some(
    (f) =>
      /^src\//.test(f) ||
      /^sdks\//.test(f) ||
      f === "package.json" ||
      f === "tsoa.json" ||
      /^Dockerfile/.test(f) ||
      f === "docker-compose.yml",
  );
  return code;
}

/**
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 800)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  if (!text) throw new Error("Gemini returned empty content");
  return text;
}

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Could not parse Gemini JSON");
  }
}

async function main() {
  const changedFiles = getChangedFiles();
  console.log("Changed files:", changedFiles.join(", ") || "(none)");

  if (!isCodeChange(changedFiles)) {
    console.log("No product code paths changed; skipping docs hub PR.");
    fs.writeFileSync(
      path.join(process.cwd(), "docs-hub-agent-result.json"),
      JSON.stringify({ skipped: true, reason: "no-code-change", updated: [] }, null, 2),
    );
    return;
  }

  const candidates = routePages(changedFiles);
  if (candidates.length === 0) {
    console.log("Router selected no pages; skipping.");
    fs.writeFileSync(
      path.join(process.cwd(), "docs-hub-agent-result.json"),
      JSON.stringify({ skipped: true, reason: "no-pages", updated: [] }, null, 2),
    );
    return;
  }

  console.log("Diátaxis candidates:", candidates.join(", "));

  const pagePayload = {};
  for (const rel of candidates) {
    const abs = path.join(PAGES_ROOT, rel);
    if (!fs.existsSync(abs)) {
      console.warn(`Missing page ${rel}, skipping candidate`);
      continue;
    }
    pagePayload[rel] = {
      ...CATALOG[rel],
      content: fs.readFileSync(abs, "utf8"),
    };
  }

  if (Object.keys(pagePayload).length === 0) {
    console.log("No readable candidate pages; skipping.");
    return;
  }

  let diff = getDiff();
  if (diff.length > 60_000) {
    diff = diff.slice(0, 60_000) + "\n\n[diff truncated]\n";
  }

  const prompt = `You are a technical writer updating an Antora docs hub that follows Diátaxis.

Service commit: ${COMMIT_SHA}
Commit message: ${COMMIT_MSG}
Changed files:
${changedFiles.map((f) => `- ${f}`).join("\n")}

Unified diff (service repo):
\`\`\`
${diff}
\`\`\`

Candidate hub pages (path → current AsciiDoc). Only update pages that truly need a change for this commit. Respect Diátaxis:
- tutorial: learning path, keep steps coherent
- how-to: task steps only
- reference: factual lookup (endpoints, headers, links) — no tutorial narrative
- explanation: why/how the docs system works
- operations: config/deploy

Return JSON only with this shape:
{
  "summary": "one sentence for the PR body",
  "updates": [
    { "path": "how-to/authentication.adoc", "content": "full new AsciiDoc file contents" }
  ]
}

Rules:
- "path" must be one of: ${Object.keys(pagePayload).join(", ")}
- "content" must be the COMPLETE updated .adoc file (AsciiDoc), not a patch
- Keep existing structure and tone unless the code change requires edits
- Do not invent APIs that are not in the diff
- If nothing needs updating, return { "summary": "", "updates": [] }

Current pages:
${JSON.stringify(pagePayload, null, 2)}
`;

  console.log(`Calling Gemini model ${GEMINI_MODEL}…`);
  const raw = await callGemini(prompt);
  const parsed = extractJson(raw);
  const updates = Array.isArray(parsed.updates) ? parsed.updates : [];
  const written = [];

  for (const upd of updates) {
    const rel = upd?.path;
    if (!rel || !pagePayload[rel]) {
      console.warn(`Ignoring update for unexpected path: ${rel}`);
      continue;
    }
    if (typeof upd.content !== "string" || !upd.content.trim()) {
      console.warn(`Empty content for ${rel}; skipping`);
      continue;
    }
    // Basic AsciiDoc sanity: must look like a document title line
    if (!/^=\s+\S/.test(upd.content.trim())) {
      console.warn(`Refusing non-AsciiDoc content for ${rel}`);
      continue;
    }
    const abs = path.join(PAGES_ROOT, rel);
    const prev = pagePayload[rel].content;
    if (prev === upd.content) continue;
    fs.writeFileSync(abs, upd.content.endsWith("\n") ? upd.content : `${upd.content}\n`, "utf8");
    written.push(rel);
    console.log(`Updated ${rel}`);
  }

  const result = {
    skipped: written.length === 0,
    reason: written.length === 0 ? "no-content-change" : undefined,
    summary: parsed.summary || "",
    updated: written,
    candidates,
    commit: COMMIT_SHA,
  };
  fs.writeFileSync(
    path.join(process.cwd(), "docs-hub-agent-result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
