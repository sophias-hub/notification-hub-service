import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { ApiError, Errors } from './errors.js';
import {
  store,
  isChannel,
  defaultPreferences,
  type Channel,
  type RecordStatus,
  type Preferences,
  type Template,
} from './store.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const VALID_API_KEY = 'secure-token-123';

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

function validateTemplateFields(body: Partial<Template>, requireAll: boolean): void {
  const id = body.id;
  const name = body.name;
  const channel = body.channel;

  if (requireAll) {
    const missing: string[] = [];
    if (!id) missing.push('id');
    if (!name) missing.push('name');
    if (!channel) missing.push('channel');
    if (missing.length) throw Errors.missingFields(missing);
  }

  if (channel !== undefined && !isChannel(channel)) {
    throw Errors.invalidChannel(String(channel));
  }

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    throw Errors.invalidTemplateBody('Template name must be a non-empty string.', { field: 'name' });
  }

  if (id !== undefined && (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id))) {
    throw Errors.invalidTemplateBody(
      "Template id must be lowercase letters, numbers, and hyphens only.",
      { field: 'id', id }
    );
  }
}

function channelAllowedOrThrow(recipient: string, channel: Channel): void {
  if (!store.isChannelAllowed(recipient, channel)) {
    throw Errors.channelOptedOut(recipient, channel);
  }
}

function recordWebhookDeliveries(recordId: string): void {
  for (const webhook of store.listWebhooks()) {
    store.addDelivery({
      id: newId('del'),
      webhookId: webhook.id,
      recordId,
      status: 'delivered',
      attemptedAt: new Date().toISOString(),
    });
  }
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
    const { id, name, channel, subject, body } = req.body as Template;
    if (store.getTemplate(id)) {
      throw Errors.templateIdExists(id);
    }
    const created = store.createTemplate({ id, name, channel, subject, body });
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof ApiError) {
      sendError(res, err);
      return;
    }
    throw err;
  }
});

app.put('/api/v1/templates/:id', authenticateApiKey, (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!store.getTemplate(id)) {
      throw Errors.templateNotFound(id);
    }
    const { name, channel, subject, body } = req.body as Partial<Template>;
    if (!name || !channel) {
      throw Errors.missingFields(
        [!name && 'name', !channel && 'channel'].filter(Boolean) as string[]
      );
    }
    validateTemplateFields({ name, channel }, false);
    const updated = store.updateTemplate(id, { name, channel, subject, body });
    res.status(200).json(updated);
  } catch (err) {
    if (err instanceof ApiError) {
      sendError(res, err);
      return;
    }
    throw err;
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
    const { name, channel, subject, body } = patch;
    const updated = store.updateTemplate(id, { name, channel, subject, body });
    res.status(200).json(updated);
  } catch (err) {
    if (err instanceof ApiError) {
      sendError(res, err);
      return;
    }
    throw err;
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
    if (err instanceof ApiError) {
      sendError(res, err);
      return;
    }
    throw err;
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

    if (!store.getTemplate(templateId)) {
      throw Errors.templateNotFound(templateId);
    }

    channelAllowedOrThrow(recipient, channel);

    const rate = store.recordSendAndCheckLimit();
    if (!rate.allowed) {
      throw Errors.rateLimited(rate.retryAfterSeconds);
    }

    const recordId = newId('rec');
    const processedAt = new Date().toISOString();
    store.createRecord({
      recordId,
      recipient,
      channel,
      templateId,
      status: 'queued',
      processedAt,
      templateData,
    });

    // Simulate quick delivery for the mock
    const rec = store.getRecord(recordId)!;
    rec.status = 'delivered';
    store.createRecord(rec);
    recordWebhookDeliveries(recordId);

    console.log(`[SUCCESS] Send recorded. Channel: ${channel} | Recipient: ${recipient}`);

    res.status(200).json({
      status: 'success',
      recordId,
      processedAt,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      sendError(res, err);
      return;
    }
    throw err;
  }
});

app.get('/api/v1/records', authenticateApiKey, (req: Request, res: Response) => {
  const recipient = typeof req.query.recipient === 'string' ? req.query.recipient : undefined;
  const status =
    typeof req.query.status === 'string' ? (req.query.status as RecordStatus) : undefined;
  res.status(200).json(store.listRecords({ recipient, status }));
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
    if (err instanceof ApiError) {
      sendError(res, err);
      return;
    }
    throw err;
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
    if (err instanceof ApiError) {
      sendError(res, err);
      return;
    }
    throw err;
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
    if (err instanceof ApiError) {
      sendError(res, err);
      return;
    }
    throw err;
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
    const webhook = store.createWebhook({
      id: newId('wh'),
      url,
      events: Array.isArray(events) ? events : ['record.delivered'],
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(webhook);
  } catch (err) {
    if (err instanceof ApiError) {
      sendError(res, err);
      return;
    }
    throw err;
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

const server = app.listen(PORT, () => {
  console.log(`🚀 Notification Hub server is running locally on http://localhost:${PORT}`);
});

export { app, server, store };
