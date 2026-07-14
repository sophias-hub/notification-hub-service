/**
 * Single source of truth for OpenAPI / Swagger Try it out examples.
 *
 * Controllers import these for `@Example` / `@Response` third arguments.
 * `scripts/enrich-swagger-examples.ts` imports the same values for body/path
 * prefills and to ensure every success and error status has a payload.
 */

export const FIXED_INSTANT = '2026-07-13T12:00:00.000Z';
export const FIXED_INSTANT_PLUS = '2026-07-13T12:00:01.000Z';

// --- Reusable error payloads -------------------------------------------------

export const unauthorized = {
  error: 'Unauthorized',
  code: 'UNAUTHORIZED',
  message: 'Missing or invalid X-API-Key header.',
};

export const missingFieldsTemplate = {
  error: 'Bad Request',
  code: 'MISSING_FIELDS',
  message: 'Missing required fields: name, channel.',
  details: { fields: ['name', 'channel'] },
};

export const missingFieldsSend = {
  error: 'Bad Request',
  code: 'MISSING_FIELDS',
  message: 'Missing required fields: channel, templateId.',
  details: { fields: ['channel', 'templateId'] },
};

export const missingFieldsPreferences = {
  error: 'Bad Request',
  code: 'MISSING_FIELDS',
  message: 'Missing required fields: email, sms, push.',
  details: { fields: ['email', 'sms', 'push'] },
};

export const missingFieldsUnsubscribe = {
  error: 'Bad Request',
  code: 'MISSING_FIELDS',
  message: 'Missing required fields: recipient, channel.',
  details: { fields: ['recipient', 'channel'] },
};

export const missingFieldsWebhook = {
  error: 'Bad Request',
  code: 'MISSING_FIELDS',
  message: 'Missing required fields: url.',
  details: { fields: ['url'] },
};

export const invalidChannel = {
  error: 'Unprocessable Entity',
  code: 'INVALID_CHANNEL',
  message: "Channel 'fax' is not supported. Use email, sms, or push.",
  details: { channel: 'fax', allowed: ['email', 'sms', 'push'] },
};

export const invalidTemplateName = {
  error: 'Unprocessable Entity',
  code: 'INVALID_TEMPLATE_BODY',
  message: 'Template name must be a non-empty string.',
  details: { field: 'name' },
};

export const invalidPreferenceType = {
  error: 'Unprocessable Entity',
  code: 'INVALID_TEMPLATE_BODY',
  message: 'Preference values must be boolean.',
  details: { field: 'push' },
};

export const invalidWebhookUrl = {
  error: 'Unprocessable Entity',
  code: 'INVALID_TEMPLATE_BODY',
  message: 'Webhook url must be an http(s) URL.',
  details: { field: 'url' },
};

export const templateNotFound = {
  error: 'NotFound',
  code: 'TEMPLATE_NOT_FOUND',
  message: "No template with id 'missing'.",
  details: { id: 'missing' },
};

export const templateInUse = {
  error: 'Conflict',
  code: 'TEMPLATE_IN_USE',
  message:
    "Template 'welcome-email' cannot be deleted because it is referenced by recent send records.",
  details: { id: 'welcome-email' },
};

export const channelOptedOut = {
  error: 'Forbidden',
  code: 'CHANNEL_OPTED_OUT',
  message: "Recipient 'user@example.com' has opted out of channel 'email'.",
  details: { recipient: 'user@example.com', channel: 'email' },
};

export const rateLimited = {
  error: 'Too Many Requests',
  code: 'RATE_LIMITED',
  message: 'Too many send requests. Retry after 42 seconds.',
  details: { retryAfterSeconds: 42 },
};

export const recordNotFound = {
  error: 'NotFound',
  code: 'RECORD_NOT_FOUND',
  message: "No record with id 'rec-missing'.",
  details: { id: 'rec-missing' },
};

export const webhookNotFound = {
  error: 'NotFound',
  code: 'WEBHOOK_NOT_FOUND',
  message: "No webhook with id 'wh-missing'.",
  details: { id: 'wh-missing' },
};

// --- Domain examples ---------------------------------------------------------

export const welcomeTemplate = {
  id: 'welcome-email',
  name: 'Welcome Email Template',
  channel: 'email' as const,
  subject: 'Welcome!',
  body: 'Hello {{name}}, welcome aboard.',
};

export const otpSmsTemplate = {
  id: 'otp-sms',
  name: 'One-Time Password SMS',
  channel: 'sms' as const,
  body: 'Your code is {{code}}.',
};

export const paymentPushTemplate = {
  id: 'payment-push',
  name: 'Payment Success Push Notification',
  channel: 'push' as const,
  body: 'Payment of {{amount}} succeeded.',
};

export const templateList = [welcomeTemplate, otpSmsTemplate, paymentPushTemplate];

export const createTemplateRequest = {
  name: 'Promo Email',
  channel: 'email' as const,
  subject: 'This week only',
  body: 'Hi {{name}}, see our offer.',
};

export const createTemplateResponse = {
  id: 'tpl-a1b2c3d4e',
  ...createTemplateRequest,
};

export const updateTemplateRequest = {
  name: 'Welcome Email Updated',
  channel: 'email' as const,
  subject: 'Welcome aboard',
  body: 'Hello {{name}}.',
};

export const updateTemplateResponse = {
  id: 'welcome-email',
  ...updateTemplateRequest,
};

export const patchTemplateRequest = {
  name: 'Patched Welcome',
};

export const patchTemplateResponse = {
  id: 'welcome-email',
  name: 'Patched Welcome',
  channel: 'email' as const,
  subject: 'Welcome!',
  body: 'Hello {{name}}, welcome aboard.',
};

export const sendRequest = {
  recipient: 'user@example.com',
  channel: 'email' as const,
  templateId: 'welcome-email',
  templateData: { name: 'Alex' },
};

export const sendResponse = {
  status: 'success' as const,
  recordId: 'rec-abc123xyz',
  processedAt: FIXED_INSTANT,
};

export const deliveryRecord = {
  recordId: 'rec-abc123xyz',
  recipient: 'user@example.com',
  channel: 'email' as const,
  templateId: 'welcome-email',
  status: 'delivered' as const,
  processedAt: FIXED_INSTANT,
  templateData: { name: 'Alex' },
};

export const deliveryRecordList = [deliveryRecord];

export const preferencesAllAllowed = {
  recipient: 'user@example.com',
  email: true,
  sms: true,
  push: true,
};

export const setPreferencesRequest = {
  email: true,
  sms: false,
  push: false,
};

export const setPreferencesResponse = {
  recipient: 'user@example.com',
  ...setPreferencesRequest,
};

export const patchPreferencesRequest = {
  push: false,
};

export const patchPreferencesResponse = {
  recipient: 'user@example.com',
  email: true,
  sms: true,
  push: false,
};

export const unsubscribeRequest = {
  recipient: 'user@example.com',
  channel: 'sms' as const,
};

export const unsubscribeResponse = {
  recipient: 'user@example.com',
  email: true,
  sms: false,
  push: true,
};

export const createWebhookRequest = {
  url: 'https://example.com/hooks/notifications',
  events: ['record.delivered'],
};

export const webhook = {
  id: 'wh-example01',
  url: 'https://example.com/hooks/notifications',
  events: ['record.delivered'],
  createdAt: FIXED_INSTANT,
};

export const webhookList = [webhook];

export const webhookDelivery = {
  id: 'del-example01',
  webhookId: 'wh-example01',
  recordId: 'rec-abc123xyz',
  status: 'delivered' as const,
  attemptedAt: FIXED_INSTANT_PLUS,
};

export const webhookDeliveryList = [webhookDelivery];

export const readyResponse = {
  status: 'ready' as const,
  store: { templates: 3, records: 0, preferences: 0, webhooks: 0, deliveries: 0 },
};

// --- Maps consumed by enrich-swagger-examples.ts -----------------------------

/** Path/query values Swagger UI should prefill (operationId → param → value). */
export const PARAM_EXAMPLES: Record<string, Record<string, string>> = {
  GetTemplate: { id: 'welcome-email' },
  UpdateTemplate: { id: 'welcome-email' },
  PatchTemplate: { id: 'welcome-email' },
  DeleteTemplate: { id: 'otp-sms' },
  GetRecord: { recordId: 'rec-abc123xyz' },
  DeleteRecord: { recordId: 'rec-abc123xyz' },
  ListRecords: { recipient: 'user@example.com', status: 'delivered' },
  GetPreferences: { recipient: 'user@example.com' },
  SetPreferences: { recipient: 'user@example.com' },
  PatchPreferences: { recipient: 'user@example.com' },
  ResetPreferences: { recipient: 'user@example.com' },
  GetWebhook: { id: 'wh-example01' },
  DeleteWebhook: { id: 'wh-example01' },
};

/** Request body examples for writes (operationId → body). */
export const BODY_EXAMPLES: Record<string, Record<string, unknown>> = {
  CreateTemplate: createTemplateRequest,
  UpdateTemplate: updateTemplateRequest,
  PatchTemplate: patchTemplateRequest,
  SendNotification: sendRequest,
  SetPreferences: setPreferencesRequest,
  PatchPreferences: patchPreferencesRequest,
  Unsubscribe: unsubscribeRequest,
  CreateWebhook: createWebhookRequest,
};

export type StatusExample = { status: string; body?: unknown };

/** Primary success response for each operation (paired with BODY / PARAM examples). */
export const SUCCESS_EXAMPLES: Record<string, StatusExample> = {
  GetReady: { status: '200', body: readyResponse },
  GetTemplates: { status: '200', body: templateList },
  GetTemplate: { status: '200', body: welcomeTemplate },
  CreateTemplate: { status: '201', body: createTemplateResponse },
  UpdateTemplate: { status: '200', body: updateTemplateResponse },
  PatchTemplate: { status: '200', body: patchTemplateResponse },
  DeleteTemplate: { status: '204' },
  SendNotification: { status: '200', body: sendResponse },
  ListRecords: { status: '200', body: deliveryRecordList },
  GetRecord: { status: '200', body: deliveryRecord },
  DeleteRecord: { status: '204' },
  GetPreferences: { status: '200', body: preferencesAllAllowed },
  SetPreferences: { status: '200', body: setPreferencesResponse },
  PatchPreferences: { status: '200', body: patchPreferencesResponse },
  ResetPreferences: { status: '200', body: preferencesAllAllowed },
  Unsubscribe: { status: '200', body: unsubscribeResponse },
  CreateWebhook: { status: '201', body: webhook },
  ListWebhooks: { status: '200', body: webhookList },
  ListWebhookDeliveries: { status: '200', body: webhookDeliveryList },
  GetWebhook: { status: '200', body: webhook },
  DeleteWebhook: { status: '204' },
};

/**
 * Every documented error status for each operation.
 * When multiple codes share a status (for example two 422s), `body` is the
 * primary Swagger example and `named` holds the rest for `x-examples`.
 */
export type ErrorStatusExample = {
  body: Record<string, unknown>;
  named?: Record<string, Record<string, unknown>>;
};

export const ERROR_EXAMPLES: Record<string, Record<string, ErrorStatusExample>> = {
  GetReady: {
    '401': { body: unauthorized },
  },
  GetTemplates: {
    '401': { body: unauthorized },
  },
  GetTemplate: {
    '401': { body: unauthorized },
    '404': { body: templateNotFound },
  },
  CreateTemplate: {
    '401': { body: unauthorized },
    '400': { body: missingFieldsTemplate },
    '422': {
      body: invalidChannel,
      named: {
        INVALID_CHANNEL: invalidChannel,
        INVALID_TEMPLATE_BODY: invalidTemplateName,
      },
    },
  },
  UpdateTemplate: {
    '401': { body: unauthorized },
    '400': { body: missingFieldsTemplate },
    '404': { body: templateNotFound },
    '422': { body: invalidChannel },
  },
  PatchTemplate: {
    '401': { body: unauthorized },
    '404': { body: templateNotFound },
    '422': { body: invalidTemplateName },
  },
  DeleteTemplate: {
    '401': { body: unauthorized },
    '404': { body: templateNotFound },
    '409': { body: templateInUse },
  },
  SendNotification: {
    '401': { body: unauthorized },
    '400': { body: missingFieldsSend },
    '403': { body: channelOptedOut },
    '404': { body: templateNotFound },
    '422': { body: invalidChannel },
    '429': { body: rateLimited },
  },
  ListRecords: {
    '401': { body: unauthorized },
  },
  GetRecord: {
    '401': { body: unauthorized },
    '404': { body: recordNotFound },
  },
  DeleteRecord: {
    '401': { body: unauthorized },
    '404': { body: recordNotFound },
  },
  GetPreferences: {
    '401': { body: unauthorized },
  },
  SetPreferences: {
    '401': { body: unauthorized },
    '400': { body: missingFieldsPreferences },
  },
  PatchPreferences: {
    '401': { body: unauthorized },
    '422': { body: invalidPreferenceType },
  },
  ResetPreferences: {
    '401': { body: unauthorized },
  },
  Unsubscribe: {
    '401': { body: unauthorized },
    '400': { body: missingFieldsUnsubscribe },
    '422': { body: invalidChannel },
  },
  CreateWebhook: {
    '401': { body: unauthorized },
    '400': { body: missingFieldsWebhook },
    '422': { body: invalidWebhookUrl },
  },
  ListWebhooks: {
    '401': { body: unauthorized },
  },
  ListWebhookDeliveries: {
    '401': { body: unauthorized },
  },
  GetWebhook: {
    '401': { body: unauthorized },
    '404': { body: webhookNotFound },
  },
  DeleteWebhook: {
    '401': { body: unauthorized },
    '404': { body: webhookNotFound },
  },
};
