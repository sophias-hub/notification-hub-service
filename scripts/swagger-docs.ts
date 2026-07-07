import express from 'express';
import swaggerUi from 'swagger-ui-express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url'; // 🌐 Import standard URL utility

// ⚡ Re-create __dirname safely in modern ES Modules scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;
const specPath = path.join(__dirname, '../docs/api/swagger.json');

// Check to ensure the file was compiled successfully
if (!fs.existsSync(specPath)) {
  console.error(`\n❌ Error: Missing file at ${specPath}`);
  console.error(`💡 Please execute 'npm run docs:build' before launching the server!\n`);
  process.exit(1);
}

// Read the generated JSON file
const swaggerDocument = JSON.parse(fs.readFileSync(specPath, 'utf8'));

// 🛠️ DYNAMIC FIX: Enforce valid URL context for Swagger UI bundle execution
if (swaggerDocument.openapi) {
  // Fix for OpenAPI 3.x specifications
  swaggerDocument.servers = [{ url: `http://localhost:${PORT}` }];
} else if (swaggerDocument.swagger) {
  // Fix for older Swagger 2.0 specifications
  swaggerDocument.host = `localhost:${PORT}`;
  swaggerDocument.schemes = ['http'];
}

// Mount the Swagger UI visual component layer 
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(PORT, () => {
  console.log(`\n🚀 UI Sandbox Live!`);
  console.log(`🌐 Explore your API documentation locally here: http://localhost:${PORT}/docs\n`);
});
