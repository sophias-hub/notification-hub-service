import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const specSource = path.join(__dirname, '../docs/api/swagger.json');
const outputDir = path.join(__dirname, '../docs/api-site');

if (!fs.existsSync(specSource)) {
  console.error(`\nMissing OpenAPI spec at ${specSource}`);
  console.error(`Run "npx tsoa spec" first.\n`);
  process.exit(1);
}

const publicApiUrl = (
  process.env.PUBLIC_API_URL ||
  process.env.API_BASE_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');

let apiOrigin: URL;
try {
  apiOrigin = new URL(publicApiUrl);
} catch {
  console.error(`\nInvalid PUBLIC_API_URL: ${publicApiUrl}\n`);
  process.exit(1);
}

const swaggerDocument = JSON.parse(fs.readFileSync(specSource, 'utf8')) as Record<
  string,
  unknown
>;

// Swagger 2.0 fields used by Swagger UI "Try it out"
swaggerDocument.host = apiOrigin.host;
swaggerDocument.basePath = apiOrigin.pathname === '/' ? '/' : apiOrigin.pathname.replace(/\/$/, '') || '/';
swaggerDocument.schemes = [apiOrigin.protocol.replace(':', '')];

// OpenAPI 3-style servers (harmless if UI ignores them on swagger: "2.0")
swaggerDocument.servers = [
  {
    url: publicApiUrl,
    description:
      publicApiUrl.includes('localhost')
        ? 'Local mock API (run npm start)'
        : 'Public mock API',
  },
];

const info = (swaggerDocument.info ?? {}) as Record<string, unknown>;
info.title = '🚀 Notification Hub API';
info.description = [
  'Portfolio mock API for email, SMS, and push notification dispatch.',
  '',
  '**Try it out:** Authorize with our try-out key `secure-token-123` (header `X-API-Key`).',
  publicApiUrl.includes('localhost')
    ? 'This build points at localhost. For the published docs site, set `PUBLIC_API_URL` to a deployed mock API.'
    : `Requests go to \`${publicApiUrl}\`.`,
].join('\n');
delete info.license;
swaggerDocument.info = info;

fs.mkdirSync(outputDir, { recursive: true });
const swaggerJson = JSON.stringify(swaggerDocument, null, 2);
fs.writeFileSync(path.join(outputDir, 'swagger.json'), swaggerJson, 'utf8');

const themeCss = fs.readFileSync(path.join(__dirname, 'swagger-ui-theme.css'), 'utf8');

// Embed the spec so Swagger UI works when opening index.html via file://
// (browsers block fetch('./swagger.json') on the file protocol).
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Docs | Notification Hub Service</title>
  <link rel="icon" href="./favicon.svg" type="image/svg+xml">
  <link rel="alternate icon" href="./favicon.png" type="image/png">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
${themeCss}
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        spec: ${swaggerJson},
        dom_id: '#swagger-ui',
        deepLinking: true,
        tryItOutEnabled: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: -1,
        defaultModelExpandDepth: 2,
        displayRequestDuration: true,
        filter: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml, 'utf8');

const brandDir = path.join(__dirname, '../docs/brand');
for (const name of ['favicon.svg', 'favicon.png']) {
  const src = path.join(brandDir, name);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(outputDir, name));
  }
}

console.log(`\nStatic Swagger UI site generated at ${outputDir}`);
console.log(`Try it out target: ${publicApiUrl}\n`);
