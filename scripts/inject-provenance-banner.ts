import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DocsMeta {
  sourceRepository: string;
  sourceSha: string;
  sourceRef: string;
  builtAt: string;
  nodeVersion: string;
  workflowRunId: string;
}

const BANNER_ID = 'docs-provenance-banner';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function shortSha(sha: string): string {
  return sha.length > 7 ? sha.slice(0, 7) : sha;
}

function formatBuiltAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toUTCString();
}

function buildBanner(meta: DocsMeta, label: string): string {
  const [owner, repo] = meta.sourceRepository.split('/');
  const repoUrl = `https://github.com/${owner}/${repo}`;
  const commitUrl = `${repoUrl}/commit/${meta.sourceSha}`;
  const workflowUrl =
    meta.workflowRunId !== 'local'
      ? `${repoUrl}/actions/runs/${meta.workflowRunId}`
      : null;

  const workflowLink = workflowUrl
    ? ` · <a href="${escapeHtml(workflowUrl)}">CI run</a>`
    : '';

  return `<div id="${BANNER_ID}" style="font:13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#1f2937;color:#f9fafb;padding:8px 16px;border-bottom:1px solid #374151;">
  <strong>${escapeHtml(label)}</strong>
  built from
  <a href="${escapeHtml(repoUrl)}" style="color:#93c5fd;">${escapeHtml(meta.sourceRepository)}</a>
  @
  <a href="${escapeHtml(commitUrl)}" style="color:#93c5fd;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(shortSha(meta.sourceSha))}</a>
  (${escapeHtml(meta.sourceRef)})
  · ${escapeHtml(formatBuiltAt(meta.builtAt))}${workflowLink}
</div>`;
}

function injectBanner(html: string, banner: string): string {
  const bannerPattern = new RegExp(
    `<div id="${BANNER_ID}"[\\s\\S]*?</div>\\s*`,
    'i',
  );

  const withoutBanner = html.replace(bannerPattern, '');

  const bodyMatch = withoutBanner.match(/<body([^>]*)>/i);
  if (!bodyMatch || bodyMatch.index === undefined) {
    return withoutBanner;
  }

  const insertAt = bodyMatch.index + bodyMatch[0].length;
  return (
    withoutBanner.slice(0, insertAt) +
    '\n' +
    banner +
    '\n' +
    withoutBanner.slice(insertAt)
  );
}

function collectHtmlFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

function defaultLabel(siteDir: string): string {
  const base = path.basename(siteDir);
  if (base === 'sdk') {
    return 'SDK reference';
  }
  if (base === 'api-site') {
    return 'API reference';
  }
  return 'Documentation';
}

function main(): void {
  const siteDir = process.argv[2];
  const label = process.argv[3] ?? (siteDir ? defaultLabel(siteDir) : 'Documentation');

  if (!siteDir) {
    console.error('Usage: tsx scripts/inject-provenance-banner.ts <site-dir> [label]');
    process.exit(1);
  }

  const resolvedSiteDir = path.resolve(siteDir);
  const metaPath = path.join(resolvedSiteDir, 'meta.json');

  if (!fs.existsSync(resolvedSiteDir)) {
    console.error(`Site directory not found: ${resolvedSiteDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(metaPath)) {
    console.error(`Missing meta.json at ${metaPath}`);
    console.error('Run scripts/generate-docs-meta.sh first.');
    process.exit(1);
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as DocsMeta;
  const banner = buildBanner(meta, label);
  const htmlFiles = collectHtmlFiles(resolvedSiteDir);

  if (htmlFiles.length === 0) {
    console.error(`No HTML files found in ${resolvedSiteDir}`);
    process.exit(1);
  }

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, injectBanner(html, banner), 'utf8');
  }

  console.log(
    `Injected provenance banner into ${htmlFiles.length} HTML file(s) in ${resolvedSiteDir}`,
  );
}

main();
