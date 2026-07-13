/**
 * Channel for which a notification is intended.
 */
export type Channel = 'email' | 'sms' | 'push';

/**
 * Delivery status for a send record.
 */
export type RecordStatus = 'queued' | 'delivered' | 'failed';

/**
 * Notification template.
 */
export interface NotificationTemplate {
  /** Human-readable template ID. @example 'welcome-email' */
  id: string;
  /** Descriptive template name. @example 'Welcome Email Template' */
  name: string;
  /** Channel: 'email' | 'sms' | 'push'. */
  channel: Channel;
  /** Optional email subject. */
  subject?: string;
  /** Optional body with {{placeholders}}. */
  body?: string;
}

/**
 * Successful send response.
 */
export interface NotificationResponse {
  status: string;
  recordId: string;
  processedAt: string;
}

/**
 * Stored delivery record for a send.
 */
export interface DeliveryRecord {
  recordId: string;
  recipient: string;
  channel: Channel;
  templateId: string;
  status: RecordStatus;
  processedAt: string;
  templateData?: Record<string, unknown>;
}

/**
 * Channel opt-in preferences for a recipient.
 */
export interface Preferences {
  recipient: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

/**
 * Registered webhook.
 */
export interface Webhook {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
}

/**
 * Fake webhook delivery attempt.
 */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  recordId: string;
  status: 'delivered' | 'failed';
  attemptedAt: string;
}

/**
 * HTTP client for the Notification Hub API.
 *
 * @example
 * ```typescript
 * const client = new NotificationClient('secure-token-123', 'http://localhost:3000');
 * const template = await client.createTemplate({
 *   id: 'onboarding-email',
 *   name: 'Onboarding',
 *   channel: 'email',
 * });
 * ```
 */
export class NotificationClient {
  private apiKey: string;
  private baseUrl: string;

  /**
   * @param apiKey - Secret passed via the `X-API-Key` header.
   * @param baseUrl - Base URL of the notification service.
   */
  constructor(apiKey: string, baseUrl: string = 'http://localhost:3000') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /** List all templates. */
  async getTemplates(): Promise<NotificationTemplate[]> {
    return this.request<NotificationTemplate[]>('GET', '/api/v1/templates');
  }

  /** Retrieve one template by id. */
  async getTemplate(id: string): Promise<NotificationTemplate> {
    return this.request<NotificationTemplate>('GET', `/api/v1/templates/${encodeURIComponent(id)}`);
  }

  /** Create a template. */
  async createTemplate(template: NotificationTemplate): Promise<NotificationTemplate> {
    return this.request<NotificationTemplate>('POST', '/api/v1/templates', template);
  }

  /** Replace a template. */
  async updateTemplate(
    id: string,
    body: Omit<NotificationTemplate, 'id'>
  ): Promise<NotificationTemplate> {
    return this.request<NotificationTemplate>(
      'PUT',
      `/api/v1/templates/${encodeURIComponent(id)}`,
      body
    );
  }

  /** Partially update a template. */
  async patchTemplate(
    id: string,
    patch: Partial<Omit<NotificationTemplate, 'id'>>
  ): Promise<NotificationTemplate> {
    return this.request<NotificationTemplate>(
      'PATCH',
      `/api/v1/templates/${encodeURIComponent(id)}`,
      patch
    );
  }

  /** Delete a template. */
  async deleteTemplate(id: string): Promise<void> {
    await this.request<void>('DELETE', `/api/v1/templates/${encodeURIComponent(id)}`);
  }

  /**
   * Send a template-driven notification.
   */
  async sendNotification(
    recipient: string,
    channel: Channel,
    templateId: string,
    templateData: Record<string, unknown> = {}
  ): Promise<NotificationResponse> {
    return this.request<NotificationResponse>('POST', '/api/v1/send', {
      recipient,
      channel,
      templateId,
      templateData,
    });
  }

  /**
   * @deprecated Use {@link sendNotification} instead.
   */
  async send(
    recipient: string,
    channel: Channel,
    rawMessage: string
  ): Promise<NotificationResponse> {
    return this.sendNotification(recipient, channel, 'legacy-raw-template', { body: rawMessage });
  }

  /** Retrieve a delivery record by id. */
  async getRecord(recordId: string): Promise<DeliveryRecord> {
    return this.request<DeliveryRecord>(
      'GET',
      `/api/v1/records/${encodeURIComponent(recordId)}`
    );
  }

  /** List delivery records, optionally filtered. */
  async listRecords(filters?: {
    recipient?: string;
    status?: RecordStatus;
  }): Promise<DeliveryRecord[]> {
    const params = new URLSearchParams();
    if (filters?.recipient) params.set('recipient', filters.recipient);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString();
    return this.request<DeliveryRecord[]>('GET', `/api/v1/records${qs ? `?${qs}` : ''}`);
  }

  /** Delete a delivery record. */
  async deleteRecord(recordId: string): Promise<void> {
    await this.request<void>('DELETE', `/api/v1/records/${encodeURIComponent(recordId)}`);
  }

  /** Get preferences for a recipient (defaults if unset). */
  async getPreferences(recipient: string): Promise<Preferences> {
    return this.request<Preferences>(
      'GET',
      `/api/v1/preferences/${encodeURIComponent(recipient)}`
    );
  }

  /** Replace preferences. */
  async setPreferences(
    recipient: string,
    prefs: { email: boolean; sms: boolean; push: boolean }
  ): Promise<Preferences> {
    return this.request<Preferences>(
      'PUT',
      `/api/v1/preferences/${encodeURIComponent(recipient)}`,
      prefs
    );
  }

  /** Partially update preferences. */
  async patchPreferences(
    recipient: string,
    patch: Partial<{ email: boolean; sms: boolean; push: boolean }>
  ): Promise<Preferences> {
    return this.request<Preferences>(
      'PATCH',
      `/api/v1/preferences/${encodeURIComponent(recipient)}`,
      patch
    );
  }

  /** Reset preferences to defaults. */
  async resetPreferences(recipient: string): Promise<Preferences> {
    return this.request<Preferences>(
      'DELETE',
      `/api/v1/preferences/${encodeURIComponent(recipient)}`
    );
  }

  /** Opt out of a single channel. */
  async unsubscribe(recipient: string, channel: Channel): Promise<Preferences> {
    return this.request<Preferences>('POST', '/api/v1/unsubscribe', { recipient, channel });
  }

  /** Register a webhook. */
  async createWebhook(url: string, events?: string[]): Promise<Webhook> {
    return this.request<Webhook>('POST', '/api/v1/webhooks', { url, events });
  }

  /** List webhooks. */
  async listWebhooks(): Promise<Webhook[]> {
    return this.request<Webhook[]>('GET', '/api/v1/webhooks');
  }

  /** Get a webhook by id. */
  async getWebhook(id: string): Promise<Webhook> {
    return this.request<Webhook>('GET', `/api/v1/webhooks/${encodeURIComponent(id)}`);
  }

  /** Delete a webhook. */
  async deleteWebhook(id: string): Promise<void> {
    await this.request<void>('DELETE', `/api/v1/webhooks/${encodeURIComponent(id)}`);
  }

  /** List webhook delivery attempts. */
  async listWebhookDeliveries(): Promise<WebhookDelivery[]> {
    return this.request<WebhookDelivery[]>('GET', '/api/v1/webhooks/deliveries');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      Accept: 'application/json',
    };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, init);
    if (response.status === 204) {
      return undefined as T;
    }
    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
        code?: string;
      };
      const detail = errorData.code
        ? `${errorData.code}: ${errorData.message || response.statusText}`
        : errorData.message || response.statusText;
      throw new Error(`Request failed (${method} ${path}): ${response.status} - ${detail}`);
    }
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}
