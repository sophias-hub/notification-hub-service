import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;
const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const specPath = path.join(__dirname, '../docs/api/swagger.json');

if (!fs.existsSync(specPath)) {
  console.error(`\n❌ Error: Missing file at ${specPath}`);
  console.error(`💡 Please execute 'npm run docs:api' before launching the server!\n`);
  process.exit(1);
}

const swaggerDocument = JSON.parse(fs.readFileSync(specPath, 'utf8'));

// Point Swagger UI at this docs server so "Try it out" stays same-origin.
// API calls are proxied from /api/* to the real service below.
if (swaggerDocument.openapi) {
  swaggerDocument.servers = [{ url: `http://localhost:${PORT}` }];
} else if (swaggerDocument.swagger) {
  swaggerDocument.host = `localhost:${PORT}`;
  swaggerDocument.schemes = ['http'];
}

app.use(express.json());

/**
 * Proxy API traffic through the docs server to avoid cross-origin issues
 * that break Swagger UI's response renderer.
 */
const proxyApi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const targetUrl = `${API_BASE_URL}${req.originalUrl}`;

  try {
    const headers = new Headers();
    const apiKey = req.header('X-API-Key');
    const contentType = req.header('Content-Type');
    const accept = req.header('Accept');

    if (apiKey) headers.set('X-API-Key', apiKey);
    if (contentType) headers.set('Content-Type', contentType);
    headers.set('Accept', accept || 'application/json');

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const init: RequestInit = { method: req.method, headers };
    if (hasBody) {
      init.body = JSON.stringify(req.body ?? {});
    }
    const upstream = await fetch(targetUrl, init);

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(await upstream.text());
  } catch (error) {
    next(error);
  }
};

app.use('/api', proxyApi);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API proxy error:', error.message);
  res.status(502).json({
    error: 'Bad Gateway',
    message: `Could not reach API at ${API_BASE_URL}. Is "npm start" running?`,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 UI Sandbox Live!`);
  console.log(`🌐 Explore your API documentation locally here: http://localhost:${PORT}/docs`);
  console.log(`🔁 Proxying /api/* to ${API_BASE_URL}\n`);
});
