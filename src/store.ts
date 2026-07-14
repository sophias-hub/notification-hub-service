export type Channel = 'email' | 'sms' | 'push';

export const ALLOWED_CHANNELS: Channel[] = ['email', 'sms', 'push'];

export function isChannel(value: unknown): value is Channel {
  return typeof value === 'string' && ALLOWED_CHANNELS.includes(value as Channel);
}

export interface Template {
  id: string;
  name: string;
  channel: Channel;
  subject?: string;
  body?: string;
}

/** Delivery status for a send record. */
export type RecordStatus = 'queued' | 'delivered' | 'failed';

export const ALLOWED_RECORD_STATUSES: RecordStatus[] = ['queued', 'delivered', 'failed'];

export function isRecordStatus(value: unknown): value is RecordStatus {
  return typeof value === 'string' && ALLOWED_RECORD_STATUSES.includes(value as RecordStatus);
}

/** Tracking record created by a successful send. */
export interface DeliveryRecord {
  recordId: string;
  recipient: string;
  channel: Channel;
  templateId: string;
  status: RecordStatus;
  processedAt: string;
  templateData?: Record<string, unknown>;
}

export interface Preferences {
  recipient: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  recordId: string;
  status: 'delivered' | 'failed';
  attemptedAt: string;
}

const SEED_TEMPLATES: Template[] = [
  {
    id: 'welcome-email',
    name: 'Welcome Email Template',
    channel: 'email',
    subject: 'Welcome!',
    body: 'Hello {{name}}, welcome aboard.',
  },
  {
    id: 'otp-sms',
    name: 'One-Time Password SMS',
    channel: 'sms',
    body: 'Your code is {{code}}.',
  },
  {
    id: 'payment-push',
    name: 'Payment Success Push Notification',
    channel: 'push',
    body: 'Payment of {{amount}} succeeded.',
  },
];

/** Default: all channels allowed until the recipient opts out. */
export function defaultPreferences(recipient: string): Preferences {
  return { recipient, email: true, sms: true, push: true };
}

export class HubStore {
  templates = new Map<string, Template>();
  records = new Map<string, DeliveryRecord>();
  preferences = new Map<string, Preferences>();
  webhooks = new Map<string, Webhook>();
  deliveries: WebhookDelivery[] = [];
  /** Timestamps of recent send attempts for rate limiting. */
  sendTimestamps: number[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.templates.clear();
    this.records.clear();
    this.preferences.clear();
    this.webhooks.clear();
    this.deliveries = [];
    this.sendTimestamps = [];
    for (const t of SEED_TEMPLATES) {
      this.templates.set(t.id, { ...t });
    }
  }

  listTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  createTemplate(template: Template): Template {
    this.templates.set(template.id, template);
    return template;
  }

  updateTemplate(id: string, patch: Partial<Omit<Template, 'id'>>): Template | undefined {
    const existing = this.templates.get(id);
    if (!existing) return undefined;
    const updated: Template = { ...existing, id };
    if (patch.name !== undefined) updated.name = patch.name;
    if (patch.channel !== undefined) updated.channel = patch.channel;
    if (patch.subject !== undefined) updated.subject = patch.subject;
    if (patch.body !== undefined) updated.body = patch.body;
    this.templates.set(id, updated);
    return updated;
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  templateInUse(id: string): boolean {
    for (const rec of this.records.values()) {
      if (rec.templateId === id) return true;
    }
    return false;
  }

  createRecord(record: DeliveryRecord): DeliveryRecord {
    this.records.set(record.recordId, record);
    return record;
  }

  getRecord(id: string): DeliveryRecord | undefined {
    return this.records.get(id);
  }

  listRecords(filters?: { recipient?: string; status?: RecordStatus }): DeliveryRecord[] {
    let list = Array.from(this.records.values());
    if (filters?.recipient) {
      list = list.filter((r) => r.recipient === filters.recipient);
    }
    if (filters?.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    return list;
  }

  deleteRecord(id: string): boolean {
    return this.records.delete(id);
  }

  getPreferences(recipient: string): Preferences {
    return this.preferences.get(recipient) ?? defaultPreferences(recipient);
  }

  setPreferences(prefs: Preferences): Preferences {
    this.preferences.set(prefs.recipient, prefs);
    return prefs;
  }

  deletePreferences(recipient: string): boolean {
    return this.preferences.delete(recipient);
  }

  isChannelAllowed(recipient: string, channel: Channel): boolean {
    const prefs = this.getPreferences(recipient);
    return prefs[channel] === true;
  }

  createWebhook(webhook: Webhook): Webhook {
    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  listWebhooks(): Webhook[] {
    return Array.from(this.webhooks.values());
  }

  getWebhook(id: string): Webhook | undefined {
    return this.webhooks.get(id);
  }

  deleteWebhook(id: string): boolean {
    const deleted = this.webhooks.delete(id);
    if (deleted) {
      this.deliveries = this.deliveries.filter((d) => d.webhookId !== id);
    }
    return deleted;
  }

  addDelivery(delivery: WebhookDelivery): void {
    this.deliveries.push(delivery);
  }

  listDeliveries(): WebhookDelivery[] {
    return [...this.deliveries];
  }

  /**
   * Returns true if the caller is within the rate limit after recording this attempt.
   * Limit: 10 sends per 60-second window.
   */
  recordSendAndCheckLimit(limit = 10, windowMs = 60_000): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    this.sendTimestamps = this.sendTimestamps.filter((t) => now - t < windowMs);
    if (this.sendTimestamps.length >= limit) {
      const oldest = this.sendTimestamps[0]!;
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return { allowed: false, retryAfterSeconds };
    }
    this.sendTimestamps.push(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  stats() {
    return {
      templates: this.templates.size,
      records: this.records.size,
      preferences: this.preferences.size,
      webhooks: this.webhooks.size,
      deliveries: this.deliveries.length,
    };
  }
}

/** Shared singleton used by the Express runtime. */
export const store = new HubStore();
