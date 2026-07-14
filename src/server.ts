import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { ApiError, Errors } from './errors.js';
import {
  store,
  isChannel,
  isRecordStatus,
  defaultPreferences,
  type Channel,
  type Preferences,
  type Template,
  type DeliveryRecord,
  type RecordStatus,
} from './store.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const VALID_API_KEY = process.env.API_KEY || 'secure-token-123';
const WEBHOOK_EVENT_DELIVERED = 'record.delivered';

app.use(express.json());

app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
  })
);

function sendError(res: Response, err: ApiError): void {
  if (err.code === 'RATE_LIMITED' && err.details?.retryAfterSeconds) {
    res.setHeader('Retry-After', String(err.details.retryAfterSeconds));
  }
  res.status(err.status).json(err.toJSON());
}

function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.header('X-API-Key');
  if (!apiKey || apiKey !== VALID_API_KEY) {
    sendError(res, Errors.unauthorized());
    return;
  }
  next();
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

function allocateId(
  prefix: string,
  exists: (id: string) => boolean
): string {
  let id = newId(prefix);
  while (exists(id)) {
    id = newId(prefix);
  }
  return id;
}

function validateTemplateFields(body: Partial<Template>, requireAll: boolean): void {
  const name = body.name;
  const channel = body.channel;

  if (requireAll) {
    const missing: string[] = [];
    // Treat only absent values as missing; empty strings are invalid body (422).
    if (name === undefined || name === null) missing.push('name');
    if (channel === undefined || channel === null) missing.push('channel');
    if (missing.length) throw Errors.missingFields(missing);
  }

  if (channel !== undefined && !isChannel(channel)) {
    throw Errors.invalidChannel(String(channel));
  }

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    throw Errors.invalidTemplateBody('Template name must be a non-empty string.', { field: 'name' });
  }
}

function buildTemplate(
  id: string,
  fields: { name: string; channel: Channel; subject?: string; body?: string }
): Template {
  const template: Template = { id, name: fields.name, channel: fields.channel };
  if (fields.subject !== undefined) template.subject = fields.subject;
  if (fields.body !== undefined) template.body = fields.body;
  return template;
}

function channelAllowedOrThrow(recipient: string, channel: Channel): void {
  if (!store.isChannelAllowed(recipient, channel)) {
    throw Errors.channelOptedOut(recipient, channel);
  }
}

function recordWebhookDeliveries(recordId: string): void {
  for (const webhook of store.listWebhooks()) {
    if (!webhook.events.includes(WEBHOOK_EVENT_DELIVERED)) {
      continue;
    }
    store.addDelivery({
      id: allocateId('del', (candidate) => store.listDeliveries().some((d) => d.id === candidate)),
      webhookId: webhook.id,
      recordId,
      status: 'delivered',
      attemptedAt: new Date().toISOString(),
    });
  }
}

function handleRouteError(res: Response, err: unknown): void {
  if (err instanceof ApiError) {
    sendError(res, err);
    return;
  }
  console.error('[ERROR] Unexpected failure:', err);
  sendError(
    res,
    new ApiError(500, 'Internal Server Error', 'INTERNAL_ERROR', 'An unexpected error occurred.')
  );
}

/**
 * @route   GET /health
 * @desc    Liveness check for hosting platforms (no auth)
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * @route   GET /api/v1/health/ready
 * @desc    Readiness with in-memory store stats
 */
app.get('/api/v1/health/ready', authenticateApiKey, (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ready',
    store: store.stats(),
  });
});

// ─── Templates ───────────────────────────────────────────────────────────────

app.get('/api/v1/templates', authenticateApiKey, (_req: Request, res: Response) => {
  res.status(200).json(store.listTemplates());
});

app.get('/api/v1/templates/:id', authenticateApiKey, (req: Request, res: Response) => {
  const template = store.getTemplate(req.params.id as string);
  if (!template) {
    sendError(res, Errors.templateNotFound(req.params.id as string));
    return;
  }
  res.status(200).json(template);
});

app.post('/api/v1/templates', authenticateApiKey, (req: Request, res: Response) => {
  try {
    validateTemplateFields(req.body, true);
    const { name, channel, subject, body } = req.body as Omit<Template, 'id'>;
    const id = allocateId('tpl', (candidate) => Boolean(store.getTemplate(candidate)));
    const fields: { name: string; channel: Channel; subject?: string; body?: string } = {
      name,
      channel,
    };
    if (subject !== undefined) fields.subject = subject;
    if (body !== undefined) fields.body = body;
    const created = store.createTemplate(buildTemplate(id, fields));
    res.status(201).json(created);
  } catch (err) {
    handleRouteError(res, err);
  }
});

app.put('/api/v1/templates/:id', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!store.getTemplate(id)) {
      throw Errors.templateNotFound(id);
    }
    const { name, channel, subject, body } = req.body as Partial<Template>;
    if (name === undefined || channel === undefined) {
      throw Errors.missingFields(
        [name === undefined && 'name', channel === undefined && 'channel'].filter(Boolean) as string[]
      );
    }
    validateTemplateFields({ name, channel }, false);
    const patch: Partial<Omit<Template, 'id'>> = { name, channel };
    if (subject !== undefined) patch.subject = subject;
    if (body !== undefined) patch.body = body;
    const updated = store.updateTemplate(id, patch);
    res.status(200).json(updated);
  } catch (err) {
    handleRouteError(res, err);
  }
});

app.patch('/api/v1/templates/:id', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!store.getTemplate(id)) {
      throw Errors.templateNotFound(id);
    }
    const patch = req.body as Partial<Template>;
    if (patch.id !== undefined && patch.id !== id) {
      throw Errors.invalidTemplateBody('Template id in body must match the path id.', {
        pathId: id,
        bodyId: patch.id,
      });
    }
    validateTemplateFields(patch, false);
    const update: Partial<Omit<Template, 'id'>> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.channel !== undefined) update.channel = patch.channel;
    if (patch.subject !== undefined) update.subject = patch.subject;
    if (patch.body !== undefined) update.body = patch.body;
    const updated = store.updateTemplate(id, update);
    res.status(200).json(updated);
  } catch (err) {
    handleRouteError(res, err);
  }
});

app.delete('/api/v1/templates/:id', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!store.getTemplate(id)) {
      throw Errors.templateNotFound(id);
    }
    if (store.templateInUse(id)) {
      throw Errors.templateInUse(id);
    }
    store.deleteTemplate(id);
    res.status(204).send();
  } catch (err) {
    handleRouteError(res, err);
  }
});

// ─── Send + Records ──────────────────────────────────────────────────────────

app.post('/api/v1/send', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const { recipient, channel, templateId, templateData } = req.body ?? {};
    const missing: string[] = [];
    if (!recipient) missing.push('recipient');
    if (!channel) missing.push('channel');
    if (!templateId) missing.push('templateId');
    if (missing.length) throw Errors.missingFields(missing);

    if (!isChannel(channel)) {
      throw Errors.invalidChannel(String(channel));
    }

    const template = store.getTemplate(templateId);
    if (!template) {
      throw Errors.templateNotFound(templateId);
    }
    if (template.channel !== channel) {
      throw Errors.invalidTemplateBody(
        `Template '${templateId}' is for channel '${template.channel}', but the send requested '${channel}'.`,
        { templateId, templateChannel: template.channel, channel }
      );
    }

    channelAllowedOrThrow(recipient, channel);

    const rate = store.recordSendAndCheckLimit();
    if (!rate.allowed) {
      throw Errors.rateLimited(rate.retryAfterSeconds);
    }

    const recordId = allocateId('rec', (candidate) => Boolean(store.getRecord(candidate)));
    const processedAt = new Date().toISOString();
    const record: DeliveryRecord = {
      recordId,
      recipient,
      channel,
      templateId,
      status: 'queued',
      processedAt,
    };
    if (templateData !== undefined) {
      record.templateData = templateData;
    }
    store.createRecord(record);

    // Simulate quick delivery for the mock
    record.status = 'delivered';
    recordWebhookDeliveries(recordId);

    console.log(`[SUCCESS] Send recorded. Channel: ${channel} | Recipient: ${recipient}`);

    res.status(200).json({
      status: 'success',
      recordId,
      processedAt,
    });
  } catch (err) {
    handleRouteError(res, err);
  }
});

app.get('/api/v1/records', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const filters: { recipient?: string; status?: RecordStatus } = {};
    if (typeof req.query.recipient === 'string') {
      filters.recipient = req.query.recipient;
    }
    if (typeof req.query.status === 'string') {
      if (!isRecordStatus(req.query.status)) {
        throw Errors.invalidTemplateBody(
          `Status '${req.query.status}' is not supported. Use queued, delivered, or failed.`,
          { status: req.query.status, allowed: ['queued', 'delivered', 'failed'] }
        );
      }
      filters.status = req.query.status;
    }
    res.status(200).json(store.listRecords(filters));
  } catch (err) {
    handleRouteError(res, err);
  }
});

app.get('/api/v1/records/:recordId', authenticateApiKey, (req: Request, res: Response) => {
  const record = store.getRecord(req.params.recordId as string);
  if (!record) {
    sendError(res, Errors.recordNotFound(req.params.recordId as string));
    return;
  }
  res.status(200).json(record);
});

app.delete('/api/v1/records/:recordId', authenticateApiKey, (req: Request, res: Response) => {
  const id = req.params.recordId as string;
  if (!store.getRecord(id)) {
    sendError(res, Errors.recordNotFound(id));
    return;
  }
  store.deleteRecord(id);
  res.status(204).send();
});

// ─── Preferences ─────────────────────────────────────────────────────────────

app.get('/api/v1/preferences/:recipient', authenticateApiKey, (req: Request, res: Response) => {
  const recipient = decodeURIComponent(req.params.recipient as string);
  res.status(200).json(store.getPreferences(recipient));
});

app.put('/api/v1/preferences/:recipient', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const recipient = decodeURIComponent(req.params.recipient as string);
    const { email, sms, push } = req.body ?? {};
    if (typeof email !== 'boolean' || typeof sms !== 'boolean' || typeof push !== 'boolean') {
      throw Errors.missingFields(
        [
          typeof email !== 'boolean' && 'email',
          typeof sms !== 'boolean' && 'sms',
          typeof push !== 'boolean' && 'push',
        ].filter(Boolean) as string[]
      );
    }
    const prefs: Preferences = { recipient, email, sms, push };
    res.status(200).json(store.setPreferences(prefs));
  } catch (err) {
    handleRouteError(res, err);
  }
});

app.patch('/api/v1/preferences/:recipient', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const recipient = decodeURIComponent(req.params.recipient as string);
    const current = store.getPreferences(recipient);
    const patch = req.body ?? {};
    for (const key of ['email', 'sms', 'push'] as const) {
      if (patch[key] !== undefined && typeof patch[key] !== 'boolean') {
        throw Errors.invalidTemplateBody(`Preference '${key}' must be a boolean.`, { field: key });
      }
    }
    const prefs: Preferences = {
      recipient,
      email: typeof patch.email === 'boolean' ? patch.email : current.email,
      sms: typeof patch.sms === 'boolean' ? patch.sms : current.sms,
      push: typeof patch.push === 'boolean' ? patch.push : current.push,
    };
    res.status(200).json(store.setPreferences(prefs));
  } catch (err) {
    handleRouteError(res, err);
  }
});

app.delete('/api/v1/preferences/:recipient', authenticateApiKey, (req: Request, res: Response) => {
  const recipient = decodeURIComponent(req.params.recipient as string);
  store.deletePreferences(recipient);
  res.status(200).json(defaultPreferences(recipient));
});

app.post('/api/v1/unsubscribe', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const { recipient, channel } = req.body ?? {};
    if (!recipient || !channel) {
      throw Errors.missingFields(
        [!recipient && 'recipient', !channel && 'channel'].filter(Boolean) as string[]
      );
    }
    if (!isChannel(channel)) {
      throw Errors.invalidChannel(String(channel));
    }
    const current = store.getPreferences(recipient);
    const prefs: Preferences = { ...current, recipient, [channel]: false };
    res.status(200).json(store.setPreferences(prefs));
  } catch (err) {
    handleRouteError(res, err);
  }
});

// ─── Webhooks ────────────────────────────────────────────────────────────────

app.post('/api/v1/webhooks', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const { url, events } = req.body ?? {};
    if (!url) throw Errors.missingFields(['url']);
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
      throw Errors.invalidTemplateBody('Webhook url must be an http(s) URL.', { field: 'url' });
    }
    let resolvedEvents: string[];
    if (events === undefined) {
      resolvedEvents = [WEBHOOK_EVENT_DELIVERED];
    } else if (
      !Array.isArray(events) ||
      events.length === 0 ||
      events.some((event) => typeof event !== 'string')
    ) {
      throw Errors.invalidTemplateBody(
        'Webhook events must be a non-empty array of event name strings.',
        { field: 'events' }
      );
    } else {
      resolvedEvents = events;
    }
    const webhook = store.createWebhook({
      id: allocateId('wh', (candidate) => Boolean(store.getWebhook(candidate))),
      url,
      events: resolvedEvents,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(webhook);
  } catch (err) {
    handleRouteError(res, err);
  }
});

app.get('/api/v1/webhooks', authenticateApiKey, (_req: Request, res: Response) => {
  res.status(200).json(store.listWebhooks());
});

app.get('/api/v1/webhooks/deliveries', authenticateApiKey, (_req: Request, res: Response) => {
  res.status(200).json(store.listDeliveries());
});

app.get('/api/v1/webhooks/:id', authenticateApiKey, (req: Request, res: Response) => {
  const webhook = store.getWebhook(req.params.id as string);
  if (!webhook) {
    sendError(res, Errors.webhookNotFound(req.params.id as string));
    return;
  }
  res.status(200).json(webhook);
});

app.delete('/api/v1/webhooks/:id', authenticateApiKey, (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!store.getWebhook(id)) {
    sendError(res, Errors.webhookNotFound(id));
    return;
  }
  store.deleteWebhook(id);
  res.status(204).send();
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  handleRouteError(res, err);
});

// Supertest drives `app` in-process. Skip listen under Jest so tests don't bind
// :3000 and collide with a local `npm start` (which surfaces as ECONNRESET).
const server =
  process.env.JEST_WORKER_ID === undefined
    ? app.listen(PORT, () => {
        console.log(`🚀 Notification Hub server is running locally on http://localhost:${PORT}`);
      })
    : undefined;

export { app, server, store };
