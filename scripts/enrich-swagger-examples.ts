/**
 * Enrich docs/api/swagger.json so Swagger UI / RapiDoc Try it out prefills
 * path, query, and body examples, and every success/error status has a payload.
 *
 * Examples are defined once in `src/openapi/examples.ts` (also used by the
 * controller `@Example` / `@Response` decorators). Run after `tsoa spec`.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  BODY_EXAMPLES,
  ERROR_EXAMPLES,
  PARAM_EXAMPLES,
  SUCCESS_EXAMPLES,
} from '../src/openapi/examples.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.join(__dirname, '../docs/api/swagger.json');

type Json = Record<string, unknown>;

function resolveRefExample(spec: Json, schema: Json): unknown {
  const ref = schema.$ref;
  if (typeof ref !== 'string') return schema.example;
  const name = ref.replace('#/definitions/', '');
  const def = (spec.definitions as Json)?.[name] as Json | undefined;
  return def?.example;
}

function setResponseExample(response: Json, body: unknown, named?: Record<string, unknown>): void {
  response.examples = {
    'application/json': body,
  };
  if (named && Object.keys(named).length > 0) {
    response['x-examples'] = named;
  }
}

function enrich(): void {
  if (!fs.existsSync(specPath)) {
    console.error(`Missing ${specPath}. Run "npx tsoa spec" first.`);
    process.exit(1);
  }

  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')) as Json;
  const paths = spec.paths as Record<string, Record<string, Json>>;
  let bodyCount = 0;
  let paramCount = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const methods of Object.values(paths)) {
    for (const op of Object.values(methods)) {
      if (!op || typeof op !== 'object' || Array.isArray(op)) continue;
      const operationId = op.operationId as string | undefined;
      if (!operationId) continue;

      const params = (op.parameters as Json[] | undefined) ?? [];
      for (const param of params) {
        if (param.in === 'body') {
          const example =
            BODY_EXAMPLES[operationId] ??
            resolveRefExample(spec, (param.schema as Json) ?? {});
          if (example !== undefined) {
            const schema = (param.schema as Json) ?? {};
            // Swagger 2 forbids siblings next to $ref; allOf keeps the ref + example.
            if (typeof schema.$ref === 'string') {
              param.schema = {
                allOf: [{ $ref: schema.$ref }],
                example,
              };
            } else {
              schema.example = example;
              param.schema = schema;
            }
            bodyCount += 1;
          }
        }

        if (param.in === 'path' || param.in === 'query') {
          const value = PARAM_EXAMPLES[operationId]?.[param.name as string];
          if (value !== undefined) {
            param['x-example'] = value;
            param.default = value;
            paramCount += 1;
          }
        }
      }

      const responses = (op.responses as Record<string, Json>) ?? {};
      op.responses = responses;

      const success = SUCCESS_EXAMPLES[operationId];
      if (success) {
        const response = responses[success.status] ?? {};
        responses[success.status] = response;
        if (success.body !== undefined) {
          setResponseExample(response, success.body);
          successCount += 1;
        } else if (success.status === '204') {
          response.description = (response.description as string) ?? 'No Content';
          successCount += 1;
        }
      }

      const errors = ERROR_EXAMPLES[operationId];
      if (errors) {
        for (const [status, example] of Object.entries(errors)) {
          const response = responses[status] ?? {
            description: `HTTP ${status}`,
            schema: { $ref: '#/definitions/ApiErrorResponse' },
          };
          responses[status] = response;
          if (!response.schema) {
            response.schema = { $ref: '#/definitions/ApiErrorResponse' };
          }
          setResponseExample(response, example.body, example.named);
          errorCount += 1;
        }
      }
    }
  }

  // Keep definition-level examples aligned for the Models section.
  const definitions = (spec.definitions as Record<string, Json>) ?? {};
  const requestDefs: Record<string, string> = {
    CreateTemplateRequest: 'CreateTemplate',
    UpdateTemplateRequest: 'UpdateTemplate',
    PatchTemplateRequest: 'PatchTemplate',
    SendRequestPayload: 'SendNotification',
    PreferencesBody: 'SetPreferences',
    PatchPreferencesBody: 'PatchPreferences',
    UnsubscribeRequest: 'Unsubscribe',
    CreateWebhookRequest: 'CreateWebhook',
  };
  const responseDefs: Record<string, string> = {
    TemplateResponse: 'GetTemplate',
    SendResponse: 'SendNotification',
    DeliveryRecordResponse: 'GetRecord',
    PreferencesResponse: 'SetPreferences',
    WebhookResponse: 'CreateWebhook',
    WebhookDeliveryResponse: 'ListWebhookDeliveries',
    ReadyResponse: 'GetReady',
    ApiErrorResponse: 'GetTemplate',
  };
  for (const [defName, opId] of Object.entries(requestDefs)) {
    const def = definitions[defName];
    const body = BODY_EXAMPLES[opId];
    if (def && body) def.example = body;
  }
  for (const [defName, opId] of Object.entries(responseDefs)) {
    const def = definitions[defName];
    if (!def) continue;
    if (defName === 'ApiErrorResponse') {
      def.example = ERROR_EXAMPLES.GetTemplate?.['404']?.body;
      continue;
    }
    const response = SUCCESS_EXAMPLES[opId]?.body;
    if (response === undefined) continue;
    def.example = (Array.isArray(response) ? response[0] : response) as Json;
  }

  fs.writeFileSync(specPath, JSON.stringify(spec, null, '\t') + '\n', 'utf8');
  console.log(
    `Enriched swagger examples: ${bodyCount} bodies, ${paramCount} path/query params, ${successCount} success responses, ${errorCount} error responses.`
  );
}

enrich();
