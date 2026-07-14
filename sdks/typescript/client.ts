/**
 * Defines how a notification is delivered to the recipient.
 *
 * **NOTE**: Supported values are `email`, `sms`, and `push`.
 */
export type Channel = 'email' | 'sms' | 'push';

/**
 * Reports where a send sits in the delivery lifecycle after you call [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification).
 *
 * **NOTE**: In this demo, most sends move to `delivered` shortly after they are accepted.
 */
export type RecordStatus = 'queued' | 'delivered' | 'failed';

/**
 * A reusable message definition stored in the template catalog.
 * Templates live only in memory for this mock service, so they disappear when the process restarts.
 */
export interface NotificationTemplate {
  /**
   * Identifies the template in other API calls.
   *
   * **NOTE**: Use lowercase letters, digits, and hyphens only (for example, `welcome-email`).
   * @example 'welcome-email'
   */
  id: string;
  /**
   * Names the template for UIs and operator tools.
   * @example 'Welcome Email Template'
   */
  name: string;
  /**
   * Defines which delivery channel this template is written for.
   */
  channel: Channel;
  /**
   * Sets the subject line when the channel is `email`.
   *
   * **NOTE**: Other channels typically leave this empty.
   */
  subject?: string;
  /**
   * Defines the message content that will be sent.
   *
   * **NOTE**: You can include placeholders such as `{{name}}`; they are filled from `templateData` when you call [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification).
   */
  body?: string;
}

/**
 * Confirmation returned when a send is accepted.
 */
export interface NotificationResponse {
  /**
   * Reports that the send was accepted. On HTTP `200` this value is `success`.
   */
  status: string;
  /**
   * Identifies the delivery record created for this send (for example, `rec-abc123xyz`).
   *
   * **NOTE**: Use this value with [`GET /api/v1/records/{recordId}`](https://sophias-hub.github.io/docs-api/#/Records/GetRecord) to look up status later.
   */
  recordId: string;
  /**
   * Reports when the service accepted the send, as an ISO-8601 timestamp in UTC.
   */
  processedAt: string;
}

/**
 * A stored receipt for one send attempt.
 *
 * **NOTE**: You can look records up after calling [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification) to see who was contacted and whether delivery finished.
 */
export interface DeliveryRecord {
  /**
   * Identifies this delivery record.
   *
   * **NOTE**: This value originally came from [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification).
   */
  recordId: string;
  /**
   * Identifies the address, phone number, or token that was targeted.
   */
  recipient: string;
  /**
   * Reports which channel was used for this send.
   */
  channel: Channel;
  /**
   * Identifies the template that was rendered for this send.
   */
  templateId: string;
  /**
   * Reports the current delivery state: `queued`, `delivered`, or `failed`.
   */
  status: RecordStatus;
  /**
   * Reports when the send was accepted, as an ISO-8601 timestamp in UTC.
   */
  processedAt: string;
  /**
   * Contains the placeholder values that were supplied with the original send, if any.
   */
  templateData?: Record<string, unknown>;
}

/**
 * Which channels a recipient is willing to receive.
 * If you have never set preferences for someone, every channel is treated as allowed (`true`).
 */
export interface Preferences {
  /**
   * Identifies the recipient these preferences belong to.
   */
  recipient: string;
  /**
   * Sets whether email is allowed.
   *
   * **NOTE**: When this is `false`, [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification) rejects email with `CHANNEL_OPTED_OUT`.
   */
  email: boolean;
  /**
   * Sets whether SMS is allowed.
   *
   * **NOTE**: When this is `false`, [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification) rejects SMS with `CHANNEL_OPTED_OUT`.
   */
  sms: boolean;
  /**
   * Sets whether push is allowed.
   *
   * **NOTE**: When this is `false`, [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification) rejects push with `CHANNEL_OPTED_OUT`.
   */
  push: boolean;
}

/**
 * A registered webhook endpoint.
 * This mock service stores the registration and invents delivery attempts; it does not make real outbound HTTP calls.
 */
export interface Webhook {
  /**
   * Identifies this webhook (for example, `wh-abc123`).
   */
  id: string;
  /**
   * Specifies the callback address your system would listen on.
   *
   * **NOTE**: It must be an `http://` or `https://` URL.
   */
  url: string;
  /**
   * Lists the event names this webhook is interested in.
   *
   * **NOTE**: If you omit `events` when creating a webhook with [`POST /api/v1/webhooks`](https://sophias-hub.github.io/docs-api/#/Webhooks/CreateWebhook), the service defaults to `["record.delivered"]`.
   */
  events: string[];
  /**
   * Reports when the webhook was registered, as an ISO-8601 timestamp in UTC.
   */
  createdAt: string;
}

/**
 * A simulated attempt to notify a webhook after a send.
 * These rows exist so you can practice reading delivery history; no real HTTP request is made.
 */
export interface WebhookDelivery {
  /**
   * Identifies this delivery attempt.
   */
  id: string;
  /**
   * Identifies the webhook that this attempt belongs to.
   */
  webhookId: string;
  /**
   * Identifies the send record that triggered the attempt.
   */
  recordId: string;
  /**
   * Reports whether the simulated attempt is treated as `delivered` or `failed`.
   */
  status: 'delivered' | 'failed';
  /**
   * Reports when the attempt was recorded, as an ISO-8601 timestamp in UTC.
   */
  attemptedAt: string;
}

/**
 * HTTP client for the Notification Hub API.
 * Every call sends your key in the `X-API-Key` header. The demo key is `secure-token-123`.
 *
 * @example
 * ```typescript
 * const client = new NotificationClient('secure-token-123', 'http://localhost:3000');
 * ```
 */
export class NotificationClient {
  private apiKey: string;
  private baseUrl: string;

  /**
   * Creates a client pointed at a Notification Hub base URL.
   * @param apiKey - Specifies the secret placed in the `X-API-Key` header on every request.
   * @param baseUrl - Sets the service origin. A trailing slash is optional and will be stripped.
   *
   * **NOTE**: Defaults to `http://localhost:3000`.
   */
  constructor(apiKey: string, baseUrl: string = 'http://localhost:3000') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Returns every template currently in the catalog, including seeded examples and any templates created at runtime.
   *
   * **NOTE**: Calls [`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates). Throws an Error whose message includes `UNAUTHORIZED` when the `X-API-Key` header is missing or invalid.
   */
  async getTemplates(): Promise<NotificationTemplate[]> {
    return this.request<NotificationTemplate[]>('GET', '/api/v1/templates');
  }

  /**
   * Looks up a single template by its `id` and returns the full template definition.
   * @param id - Selects which template to retrieve (for example, `welcome-email`).
   *
   * **NOTE**: Calls [`GET /api/v1/templates/{id}`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplate). Throws an Error whose message includes `TEMPLATE_NOT_FOUND` when no template matched this `id`. List templates with [`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates), confirm the spelling, or create the template before retrying.
   */
  async getTemplate(id: string): Promise<NotificationTemplate> {
    return this.request<NotificationTemplate>('GET', `/api/v1/templates/${encodeURIComponent(id)}`);
  }

  /**
   * Adds a new template to the catalog and returns the created object.
   *
   * **NOTE**: Calls [`POST /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/CreateTemplate) (`201`). The call fails if the `id` is already taken, the channel is unsupported, or the `id` or `name` is invalid. Throws an Error whose message may include:
   * `UNAUTHORIZED` — send header `X-API-Key` with a valid key and retry;
   * `MISSING_FIELDS` — include `id`, `name`, and `channel`, then retry;
   * `TEMPLATE_ID_EXISTS` — choose a new `id`, or update the existing template with `PUT` / `PATCH` instead of creating;
   * `INVALID_CHANNEL` — use only `email`, `sms`, or `push`, then retry;
   * `INVALID_TEMPLATE_BODY` — use a non-empty `name` and an `id` of lowercase letters, digits, and hyphens only, then retry.
   */
  async createTemplate(template: NotificationTemplate): Promise<NotificationTemplate> {
    return this.request<NotificationTemplate>('POST', '/api/v1/templates', template);
  }

  /**
   * Replaces the `name`, `channel`, and optional content of an existing template with the values you provide.
   * @param id - Selects which existing template to replace.
   *
   * **NOTE**: Calls [`PUT /api/v1/templates/{id}`](https://sophias-hub.github.io/docs-api/#/Templates/UpdateTemplate). Throws an Error whose message may include:
   * `TEMPLATE_NOT_FOUND` — list templates with [`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates) and confirm the id before retrying;
   * `MISSING_FIELDS` — include `name` and `channel` in the body, then retry;
   * `INVALID_CHANNEL` — use only `email`, `sms`, or `push`, then retry.
   */
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

  /**
   * Updates only the template fields included in the request body and leaves everything else unchanged.
   * @param id - Selects which existing template to change.
   *
   * **NOTE**: Calls [`PATCH /api/v1/templates/{id}`](https://sophias-hub.github.io/docs-api/#/Templates/PatchTemplate). Throws an Error whose message may include:
   * `TEMPLATE_NOT_FOUND` — list templates with [`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates) and confirm the id before retrying;
   * `INVALID_TEMPLATE_BODY` — correct the field shown in `details` (for example an empty `name` or unsupported `channel`) and retry.
   */
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

  /**
   * Deletes a template from the catalog.
   * @param id - Selects which template to remove.
   *
   * **NOTE**: Calls [`DELETE /api/v1/templates/{id}`](https://sophias-hub.github.io/docs-api/#/Templates/DeleteTemplate) (`204`). Throws an Error whose message may include:
   * `TEMPLATE_NOT_FOUND` — it may already be deleted; list templates to confirm;
   * `TEMPLATE_IN_USE` — delivery records still reference this template; delete or wait out those records under [`GET /api/v1/records`](https://sophias-hub.github.io/docs-api/#/Records/ListRecords), then retry the template delete.
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.request<void>('DELETE', `/api/v1/templates/${encodeURIComponent(id)}`);
  }

  /**
   * Accepts a notification send, creates a delivery record, and returns the new `recordId`.
   * @param recipient - Specifies who should receive the notification.
   * @param channel - Defines which channel to deliver on (`email`, `sms`, or `push`).
   * @param templateId - Selects which catalog template to render and send.
   * @param templateData - Supplies key/value pairs that fill `{{placeholders}}` in the template `subject` and `body`.
   *
   * **NOTE**: Calls [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification). Before accepting the request, the service checks preferences, that the template exists, that the channel is valid, and that you are within the send rate limit. Throws an Error whose message may include:
   * `MISSING_FIELDS` — include `recipient`, `channel`, and `templateId`, then retry;
   * `CHANNEL_OPTED_OUT` — check preferences with [`GET /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/GetPreferences), allow the channel with `PUT`/`PATCH`, or choose a different channel;
   * `TEMPLATE_NOT_FOUND` — list templates with [`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates) or create the template before sending;
   * `INVALID_CHANNEL` — use only `email`, `sms`, or `push`, then retry;
   * `RATE_LIMITED` — wait for the seconds in `details.retryAfterSeconds` (and honor `Retry-After`), then retry.
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
   * @deprecated Prefer {@link sendNotification}.
   * Sends through the legacy path by using template id `legacy-raw-template` and `{ body: rawMessage }`.
   */
  async send(
    recipient: string,
    channel: Channel,
    rawMessage: string
  ): Promise<NotificationResponse> {
    return this.sendNotification(recipient, channel, 'legacy-raw-template', { body: rawMessage });
  }

  /**
   * Returns one delivery record so you can inspect status and related send details.
   * @param recordId - Selects which record to retrieve (the id returned by [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification), for example `rec-abc123xyz`).
   *
   * **NOTE**: Calls [`GET /api/v1/records/{recordId}`](https://sophias-hub.github.io/docs-api/#/Records/GetRecord). Throws an Error whose message includes `RECORD_NOT_FOUND` when no delivery record matched this `recordId`. Confirm the id from the send response, or list records with [`GET /api/v1/records`](https://sophias-hub.github.io/docs-api/#/Records/ListRecords).
   */
  async getRecord(recordId: string): Promise<DeliveryRecord> {
    return this.request<DeliveryRecord>(
      'GET',
      `/api/v1/records/${encodeURIComponent(recordId)}`
    );
  }

  /**
   * Lists delivery records that were created by earlier [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification) calls.
   * @param filters.recipient - Limits results to this exact recipient when provided.
   * @param filters.status - Limits results to this lifecycle state when provided (`queued`, `delivered`, or `failed`).
   *
   * **NOTE**: Calls [`GET /api/v1/records`](https://sophias-hub.github.io/docs-api/#/Records/ListRecords). You can narrow the list by `recipient`, by `status`, or by both.
   */
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

  /**
   * Removes a delivery record from the in-memory store.
   * @param recordId - Selects which record to delete.
   *
   * **NOTE**: Calls [`DELETE /api/v1/records/{recordId}`](https://sophias-hub.github.io/docs-api/#/Records/DeleteRecord) (`204`). Throws an Error whose message includes `RECORD_NOT_FOUND` when no delivery record matched this `recordId`. It may already be deleted; list records to confirm.
   */
  async deleteRecord(recordId: string): Promise<void> {
    await this.request<void>('DELETE', `/api/v1/records/${encodeURIComponent(recordId)}`);
  }

  /**
   * Returns the channel preferences for a recipient.
   * @param recipient - Selects whose preferences to read. URL-encode special characters if needed.
   *
   * **NOTE**: Calls [`GET /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/GetPreferences). If you have never saved preferences for them, every channel defaults to allowed (`true`).
   */
  async getPreferences(recipient: string): Promise<Preferences> {
    return this.request<Preferences>(
      'GET',
      `/api/v1/preferences/${encodeURIComponent(recipient)}`
    );
  }

  /**
   * Replaces all three channel preference flags for the recipient with the values in the request body.
   * @param recipient - Selects whose preferences to overwrite.
   *
   * **NOTE**: Calls [`PUT /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/SetPreferences). Throws an Error whose message includes `MISSING_FIELDS` when required preference flags were omitted. Include boolean `email`, `sms`, and `push`, then retry.
   */
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

  /**
   * Changes only the preference flags included in the request body and leaves the others unchanged.
   * @param recipient - Selects whose preferences to adjust.
   *
   * **NOTE**: Calls [`PATCH /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/PatchPreferences). Throws an Error whose message includes `INVALID_TEMPLATE_BODY` when a preference value was not a boolean. Send only `true` or `false` for `email`, `sms`, and/or `push`, then retry.
   */
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

  /**
   * Clears any stored preferences for the recipient so the defaults apply again (all channels allowed).
   * @param recipient - Selects whose stored preferences should be removed.
   *
   * **NOTE**: Calls [`DELETE /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/ResetPreferences).
   */
  async resetPreferences(recipient: string): Promise<Preferences> {
    return this.request<Preferences>(
      'DELETE',
      `/api/v1/preferences/${encodeURIComponent(recipient)}`
    );
  }

  /**
   * Turns off one channel for a recipient by setting that channel's preference to `false`.
   *
   * **NOTE**: Calls [`POST /api/v1/unsubscribe`](https://sophias-hub.github.io/docs-api/#/Preferences/Unsubscribe). Throws an Error whose message may include:
   * `MISSING_FIELDS` — include `recipient` and `channel`, then retry;
   * `INVALID_CHANNEL` — use only `email`, `sms`, or `push`, then retry.
   */
  async unsubscribe(recipient: string, channel: Channel): Promise<Preferences> {
    return this.request<Preferences>('POST', '/api/v1/unsubscribe', { recipient, channel });
  }

  /**
   * Registers a webhook URL so the mock can associate later [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification) calls with that endpoint.
   * @param url - Specifies the callback URL to register. It must start with `http://` or `https://`.
   * @param events - Selects which event names to subscribe to. When omitted, the service uses `["record.delivered"]`.
   *
   * **NOTE**: Calls [`POST /api/v1/webhooks`](https://sophias-hub.github.io/docs-api/#/Webhooks/CreateWebhook) (`201`). The service records fake delivery attempts for practice; it does not call the URL. Throws an Error whose message may include:
   * `MISSING_FIELDS` — provide an `http://` or `https://` callback URL, then retry;
   * `INVALID_TEMPLATE_BODY` — correct `url` to a valid `http://` or `https://` address and retry.
   */
  async createWebhook(url: string, events?: string[]): Promise<Webhook> {
    return this.request<Webhook>('POST', '/api/v1/webhooks', { url, events });
  }

  /**
   * Returns every webhook that is currently registered in the in-memory store.
   *
   * **NOTE**: Calls [`GET /api/v1/webhooks`](https://sophias-hub.github.io/docs-api/#/Webhooks/ListWebhooks).
   */
  async listWebhooks(): Promise<Webhook[]> {
    return this.request<Webhook[]>('GET', '/api/v1/webhooks');
  }

  /**
   * Looks up one registered webhook by its `id`.
   * @param id - Selects which webhook to retrieve (for example, `wh-abc123`).
   *
   * **NOTE**: Calls [`GET /api/v1/webhooks/{id}`](https://sophias-hub.github.io/docs-api/#/Webhooks/GetWebhook). Throws an Error whose message includes `WEBHOOK_NOT_FOUND` when no webhook matched this `id`. List webhooks with [`GET /api/v1/webhooks`](https://sophias-hub.github.io/docs-api/#/Webhooks/ListWebhooks), or create one before looking it up.
   */
  async getWebhook(id: string): Promise<Webhook> {
    return this.request<Webhook>('GET', `/api/v1/webhooks/${encodeURIComponent(id)}`);
  }

  /**
   * Removes a webhook registration from the in-memory store.
   * @param id - Selects which webhook to delete.
   *
   * **NOTE**: Calls [`DELETE /api/v1/webhooks/{id}`](https://sophias-hub.github.io/docs-api/#/Webhooks/DeleteWebhook) (`204`). Throws an Error whose message includes `WEBHOOK_NOT_FOUND` when no webhook matched this `id`. It may already be deleted; list webhooks to confirm.
   */
  async deleteWebhook(id: string): Promise<void> {
    await this.request<void>('DELETE', `/api/v1/webhooks/${encodeURIComponent(id)}`);
  }

  /**
   * Returns the simulated webhook delivery attempts that were recorded after recent [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification) calls.
   *
   * **NOTE**: Calls [`GET /api/v1/webhooks/deliveries`](https://sophias-hub.github.io/docs-api/#/Webhooks/ListWebhookDeliveries).
   */
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
