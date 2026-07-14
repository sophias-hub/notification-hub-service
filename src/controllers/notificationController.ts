import {
  Controller,
  Route,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Path,
  Query,
  SuccessResponse,
  Response,
  Security,
  Example,
  Tags,
} from 'tsoa';

import {
  readyResponse,
  templateList,
  welcomeTemplate,
  createTemplateResponse,
  updateTemplateResponse,
  patchTemplateResponse,
  sendResponse,
  deliveryRecord,
  deliveryRecordList,
  preferencesAllAllowed,
  setPreferencesResponse,
  patchPreferencesResponse,
  unsubscribeResponse,
  webhook,
  webhookList,
  webhookDeliveryList,
  unauthorized,
  missingFieldsTemplate,
  missingFieldsSend,
  missingFieldsPreferences,
  missingFieldsUnsubscribe,
  missingFieldsWebhook,
  invalidChannel,
  invalidTemplateName,
  invalidPreferenceType,
  invalidWebhookUrl,
  templateNotFound,
  templateInUse,
  channelOptedOut,
  rateLimited,
  recordNotFound,
  webhookNotFound,
} from '../openapi/examples.js';

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
export interface TemplateResponse {
  /**
   * Identifies the template in other API calls.
   *
   * **NOTE**: Assigned by the service when you create a template. Use this value for retrieve, update, delete, and send.
   */
  id: string;
  /**
   * Names the template for UIs and operator tools.
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
 * Fields required to add a new template to the catalog.
 */
export interface CreateTemplateRequest {
  /**
   * Names the template for people reading catalogs and UIs.
   *
   * **NOTE**: An empty `name` is rejected with `422` and code `INVALID_TEMPLATE_BODY`.
   */
  name: string;
  /**
   * Defines which channel this template should be used with: `email`, `sms`, or `push`.
   */
  channel: Channel;
  /**
   * Sets an optional subject line. This is mainly useful for email templates.
   */
  subject?: string;
  /**
   * Defines the message text to send.
   *
   * **NOTE**: Placeholders like `{{name}}` are replaced from send-time `templateData` when you call [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification).
   */
  body?: string;
}

/**
 * Fields used to fully replace an existing template with a `PUT` request.
 */
export interface UpdateTemplateRequest {
  /**
   * Replaces the display name for the template.
   *
   * **NOTE**: An empty `name` is rejected with `422` and code `INVALID_TEMPLATE_BODY`.
   */
  name: string;
  /**
   * Defines which channel this template should use after the update.
   */
  channel: Channel;
  /**
   * Sets an optional subject line, mainly for email templates.
   */
  subject?: string;
  /**
   * Replaces the message text, which may include `{{placeholder}}` tokens.
   */
  body?: string;
}

/**
 * Fields for a partial template update with `PATCH`.
 * Include only the properties you want to change; omitted fields stay as they are.
 */
export interface PatchTemplateRequest {
  /**
   * Renames the template when provided.
   */
  name?: string;
  /**
   * Retargets the template to a different channel when provided.
   */
  channel?: Channel;
  /**
   * Replaces the subject line when provided.
   */
  subject?: string;
  /**
   * Replaces the message body when provided.
   */
  body?: string;
}

/**
 * Fields required to send a notification from a template.
 *
 * **NOTE**: The service allows up to 10 successful sends in any 60-second window; beyond that it returns `429` with code `RATE_LIMITED`. If the recipient has opted out of the requested channel, the API returns `403` with code `CHANNEL_OPTED_OUT`.
 */
export interface SendRequestPayload {
  /**
   * Specifies who should receive the notification.
   *
   * **NOTE**: Use an email address for `email`, a phone number for `sms`, or a device token for `push`.
   */
  recipient: string;
  /**
   * Defines which channel to deliver on.
   *
   * **NOTE**: Choose a supported value (`email`, `sms`, or `push`) that matches how you intend to reach the recipient.
   */
  channel: Channel;
  /**
   * Selects which catalog template to render and send.
   *
   * **NOTE**: The template must already exist. List templates with [`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates) or create one with [`POST /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/CreateTemplate) before sending.
   */
  templateId: string;
  /**
   * Supplies key/value pairs that fill `{{placeholders}}` in the template `subject` and `body`.
   * For example, `{ "name": "Alex" }` replaces `{{name}}`.
   */
  templateData?: Record<string, unknown>;
}

/**
 * Confirmation returned when a send is accepted.
 */
export interface SendResponse {
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
export interface DeliveryRecordResponse {
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
export interface PreferencesResponse {
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
 * Body used to replace all preference flags for a recipient with `PUT`.
 */
export interface PreferencesBody {
  /**
   * Sets whether email is allowed (`true`) or blocked (`false`).
   */
  email: boolean;
  /**
   * Sets whether SMS is allowed (`true`) or blocked (`false`).
   */
  sms: boolean;
  /**
   * Sets whether push is allowed (`true`) or blocked (`false`).
   */
  push: boolean;
}

/**
 * Body used to change only some preference flags with `PATCH`.
 * Omit any channel you do not want to change.
 */
export interface PatchPreferencesBody {
  /**
   * Sets a new email opt-in value when provided.
   */
  email?: boolean;
  /**
   * Sets a new SMS opt-in value when provided.
   */
  sms?: boolean;
  /**
   * Sets a new push opt-in value when provided.
   */
  push?: boolean;
}

/**
 * Body used to opt a recipient out of a single channel.
 */
export interface UnsubscribeRequest {
  /**
   * Specifies which person or device to update.
   */
  recipient: string;
  /**
   * Selects the channel to turn off.
   *
   * **NOTE**: After [`POST /api/v1/unsubscribe`](https://sophias-hub.github.io/docs-api/#/Preferences/Unsubscribe), that channel's preference becomes `false`.
   */
  channel: Channel;
}

/**
 * A registered webhook endpoint.
 * This mock service stores the registration and invents delivery attempts; it does not make real outbound HTTP calls.
 */
export interface WebhookResponse {
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
 * Fields required to register a new webhook.
 */
export interface CreateWebhookRequest {
  /**
   * Specifies the callback URL to register.
   *
   * **NOTE**: It must start with `http://` or `https://`.
   */
  url: string;
  /**
   * Selects which event names to subscribe to.
   *
   * **NOTE**: When omitted, the service uses `["record.delivered"]`.
   */
  events?: string[];
}

/**
 * A simulated attempt to notify a webhook after a send.
 * These rows exist so you can practice reading delivery history; no real HTTP request is made.
 */
export interface WebhookDeliveryResponse {
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
 * Authenticated readiness details for operators and health checks.
 */
export interface ReadyResponse {
  /**
   * Reports that the process can accept API traffic. A healthy response uses the value `ready`.
   */
  status: string;
  /**
   * Summarizes how many objects currently sit in each in-memory collection.
   */
  store: {
    /**
     * Counts templates currently stored.
     */
    templates: number;
    /**
     * Counts delivery records currently stored.
     */
    records: number;
    /**
     * Counts recipients with stored preference rows.
     */
    preferences: number;
    /**
     * Counts registered webhooks.
     */
    webhooks: number;
    /**
     * Counts simulated webhook delivery attempts.
     */
    deliveries: number;
  };
}

/**
 * The standard error object returned for client and authorization failures.
 */
export interface ApiErrorResponse {
  /**
   * Labels the HTTP outcome in short form, such as `NotFound` or `Unauthorized`.
   */
  error: string;
  /**
   * Identifies the failure with a stable machine-readable code you can branch on (for example, `TEMPLATE_NOT_FOUND`).
   */
  code: string;
  /**
   * Explains what went wrong in plain language.
   */
  message: string;
  /**
   * Provides optional structured context, such as field names, ids, or `retryAfterSeconds`.
   */
  details?: Record<string, unknown>;
}

@Route('api/v1')
export class NotificationController extends Controller {
  /**
   * Checks that the service is ready to handle authenticated traffic and returns counts from the in-memory store.
   *
   * **NOTE**: You must send a valid `X-API-Key` header. Stored data is not durable across restarts.
   * @summary Ready
   */
  @Tags('Health')
  @Security('ApiKeyAuth')
  @Get('health/ready')
  @Example<ReadyResponse>(readyResponse)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` (or your configured key) and retry.',
    unauthorized
  )
  public async getReady(): Promise<ReadyResponse> {
    return {
      status: 'ready',
      store: { templates: 3, records: 0, preferences: 0, webhooks: 0, deliveries: 0 },
    };
  }

  /**
   * Returns every template currently in the catalog, including seeded examples and any templates created at runtime.
   * @summary List templates
   */
  @Tags('Templates')
  @Security('ApiKeyAuth')
  @Get('templates')
  @Example<TemplateResponse[]>(templateList)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  public async getTemplates(): Promise<TemplateResponse[]> {
    return [
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
  }

  /**
   * Looks up a single template by its `id` and returns the full template definition.
   * @summary Get template
   * @param id Selects which template to retrieve (for example, `welcome-email`).
   */
  @Tags('Templates')
  @Security('ApiKeyAuth')
  @Get('templates/{id}')
  @Example<TemplateResponse>(welcomeTemplate)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    404,
    '`TEMPLATE_NOT_FOUND` — No template matched this `id`. List templates with [`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates), confirm the spelling, or create the template before retrying.',
    templateNotFound
  )
  public async getTemplate(@Path() id: string): Promise<TemplateResponse> {
    return {
      id,
      name: 'Welcome Email Template',
      channel: 'email',
      subject: 'Welcome!',
      body: 'Hello {{name}}, welcome aboard.',
    };
  }

  /**
   * Adds a new template to the catalog and returns the created object (including a service-assigned `id`).
   *
   * **NOTE**: Do not send `id` in the body. The service assigns one. The call fails if the channel is unsupported or the `name` is invalid.
   * @summary Create template
   */
  @Tags('Templates')
  @Security('ApiKeyAuth')
  @Post('templates')
  @SuccessResponse(201, 'Created')
  @Example<TemplateResponse>(createTemplateResponse)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    400,
    '`MISSING_FIELDS` — One or more required body fields were omitted. Include `name` and `channel`, then retry.',
    missingFieldsTemplate
  )
  @Response<ApiErrorResponse>(
    422,
    '`INVALID_CHANNEL` — The `channel` value is not supported. Use only `email`, `sms`, or `push`, then retry.',
    invalidChannel
  )
  @Response<ApiErrorResponse>(
    422,
    '`INVALID_TEMPLATE_BODY` — The `name` failed validation. Use a non-empty `name`, then retry.',
    invalidTemplateName
  )
  public async createTemplate(@Body() body: CreateTemplateRequest): Promise<TemplateResponse> {
    this.setStatus(201);
    return { id: 'tpl-a1b2c3d4e', ...body };
  }

  /**
   * Replaces the `name`, `channel`, and optional content of an existing template with the values you provide.
   * @summary Update template
   * @param id Selects which existing template to replace.
   */
  @Tags('Templates')
  @Security('ApiKeyAuth')
  @Put('templates/{id}')
  @Example<TemplateResponse>(updateTemplateResponse)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    400,
    '`MISSING_FIELDS` — Required update fields were omitted. Include `name` and `channel` in the body, then retry.',
    missingFieldsTemplate
  )
  @Response<ApiErrorResponse>(
    404,
    '`TEMPLATE_NOT_FOUND` — No template matched this path `id`. List templates with [`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates) and confirm the id before retrying.',
    templateNotFound
  )
  @Response<ApiErrorResponse>(
    422,
    '`INVALID_CHANNEL` — The `channel` value is not supported. Use only `email`, `sms`, or `push`, then retry.',
    invalidChannel
  )
  public async updateTemplate(
    @Path() id: string,
    @Body() body: UpdateTemplateRequest
  ): Promise<TemplateResponse> {
    return { id, ...body };
  }

  /**
   * Updates only the template fields included in the request body and leaves everything else unchanged.
   * @summary Patch template
   * @param id Selects which existing template to change.
   */
  @Tags('Templates')
  @Security('ApiKeyAuth')
  @Patch('templates/{id}')
  @Example<TemplateResponse>(patchTemplateResponse)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    404,
    '`TEMPLATE_NOT_FOUND` — No template matched this path `id`. List templates with [`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates) and confirm the id before retrying.',
    templateNotFound
  )
  @Response<ApiErrorResponse>(
    422,
    '`INVALID_TEMPLATE_BODY` — A provided field failed validation (for example an empty `name` or unsupported `channel`). Correct the field shown in `details` and retry.',
    invalidTemplateName
  )
  public async patchTemplate(
    @Path() id: string,
    @Body() body: PatchTemplateRequest
  ): Promise<TemplateResponse> {
    return { id, name: body.name ?? 'Welcome Email Template', channel: body.channel ?? 'email', ...body };
  }

  /**
   * Deletes a template from the catalog.
   *
   * **NOTE**: If any delivery record still references the template, the API refuses the delete and returns `409` with code `TEMPLATE_IN_USE`.
   * @summary Delete template
   * @param id Selects which template to remove.
   */
  @Tags('Templates')
  @Security('ApiKeyAuth')
  @Delete('templates/{id}')
  @SuccessResponse(204, 'No Content')
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    404,
    '`TEMPLATE_NOT_FOUND` — No template matched this `id`. It may already be deleted; list templates to confirm.',
    templateNotFound
  )
  @Response<ApiErrorResponse>(
    409,
    '`TEMPLATE_IN_USE` — Delivery records still reference this template. Delete or wait out those records under `/api/v1/records`, then retry the template delete.',
    templateInUse
  )
  public async deleteTemplate(@Path() id: string): Promise<void> {
    this.setStatus(204);
  }

  /**
   * Accepts a notification send, creates a delivery record, and returns the new `recordId`.
   *
   * **NOTE**: Before accepting the request, the service checks preferences, that the template exists, that the channel is valid, and that you are within the send rate limit.
   * @summary Send notification
   */
  @Tags('Send')
  @Security('ApiKeyAuth')
  @Post('send')
  @Example<SendResponse>(sendResponse)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    400,
    '`MISSING_FIELDS` — Required send fields were omitted. Include `recipient`, `channel`, and `templateId`, then retry.',
    missingFieldsSend
  )
  @Response<ApiErrorResponse>(
    403,
    '`CHANNEL_OPTED_OUT` — This recipient blocked the requested channel. Check preferences with [`GET /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/GetPreferences), allow the channel with [`PUT /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/SetPreferences) / [`PATCH /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/PatchPreferences), or choose a different channel.',
    channelOptedOut
  )
  @Response<ApiErrorResponse>(
    404,
    '`TEMPLATE_NOT_FOUND` — The `templateId` does not exist. List templates with [`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates) or create the template before sending.',
    templateNotFound
  )
  @Response<ApiErrorResponse>(
    422,
    '`INVALID_CHANNEL` — The `channel` value is not supported. Use only `email`, `sms`, or `push`, then retry.',
    invalidChannel
  )
  @Response<ApiErrorResponse>(
    429,
    '`RATE_LIMITED` — More than 10 successful sends occurred in the last 60 seconds. Wait for the seconds in `details.retryAfterSeconds` (and honor `Retry-After`), then retry.',
    rateLimited
  )
  public async sendNotification(@Body() body: SendRequestPayload): Promise<SendResponse> {
    return {
      status: 'success',
      recordId: `rec-${Math.random().toString(36).substring(2, 11)}`,
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * Lists delivery records that were created by earlier [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification) calls.
   *
   * **NOTE**: You can narrow the list by `recipient`, by `status`, or by both.
   * @summary List records
   * @param recipient Limits results to this exact recipient when provided.
   * @param status Limits results to this lifecycle state when provided (`queued`, `delivered`, or `failed`).
   */
  @Tags('Records')
  @Security('ApiKeyAuth')
  @Get('records')
  @Example<DeliveryRecordResponse[]>(deliveryRecordList)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  public async listRecords(
    @Query() recipient?: string,
    @Query() status?: string
  ): Promise<DeliveryRecordResponse[]> {
    return [
      {
        recordId: 'rec-example01',
        recipient: recipient ?? 'user@example.com',
        channel: 'email',
        templateId: 'welcome-email',
        status: (status as RecordStatus) || 'delivered',
        processedAt: new Date().toISOString(),
        templateData: { name: 'Alex' },
      },
    ];
  }

  /**
   * Returns one delivery record so you can inspect status and related send details.
   * @summary Get record
   * @param recordId Selects which record to retrieve (the id returned by [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification), for example `rec-abc123xyz`).
   */
  @Tags('Records')
  @Security('ApiKeyAuth')
  @Get('records/{recordId}')
  @Example<DeliveryRecordResponse>(deliveryRecord)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    404,
    '`RECORD_NOT_FOUND` — No delivery record matched this `recordId`. Confirm the id from the send response, or list records with [`GET /api/v1/records`](https://sophias-hub.github.io/docs-api/#/Records/ListRecords).',
    recordNotFound
  )
  public async getRecord(@Path() recordId: string): Promise<DeliveryRecordResponse> {
    return {
      recordId,
      recipient: 'user@example.com',
      channel: 'email',
      templateId: 'welcome-email',
      status: 'delivered',
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * Removes a delivery record from the in-memory store.
   * @summary Delete record
   * @param recordId Selects which record to delete.
   */
  @Tags('Records')
  @Security('ApiKeyAuth')
  @Delete('records/{recordId}')
  @SuccessResponse(204, 'No Content')
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    404,
    '`RECORD_NOT_FOUND` — No delivery record matched this `recordId`. It may already be deleted; list records to confirm.',
    recordNotFound
  )
  public async deleteRecord(@Path() recordId: string): Promise<void> {
    this.setStatus(204);
  }

  /**
   * Returns the channel preferences for a recipient.
   *
   * **NOTE**: If you have never saved preferences for them, every channel defaults to allowed (`true`).
   * @summary Get preferences
   * @param recipient Selects whose preferences to read. URL-encode special characters if needed.
   */
  @Tags('Preferences')
  @Security('ApiKeyAuth')
  @Get('preferences/{recipient}')
  @Example<PreferencesResponse>(preferencesAllAllowed)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  public async getPreferences(@Path() recipient: string): Promise<PreferencesResponse> {
    return { recipient, email: true, sms: true, push: true };
  }

  /**
   * Replaces all three channel preference flags for the recipient with the values in the request body.
   * @summary Set preferences
   * @param recipient Selects whose preferences to overwrite.
   */
  @Tags('Preferences')
  @Security('ApiKeyAuth')
  @Put('preferences/{recipient}')
  @Example<PreferencesResponse>(setPreferencesResponse)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    400,
    '`MISSING_FIELDS` — Required preference flags were omitted. Include boolean `email`, `sms`, and `push`, then retry.',
    missingFieldsPreferences
  )
  public async setPreferences(
    @Path() recipient: string,
    @Body() body: PreferencesBody
  ): Promise<PreferencesResponse> {
    return { recipient, ...body };
  }

  /**
   * Changes only the preference flags included in the request body and leaves the others unchanged.
   * @summary Patch preferences
   * @param recipient Selects whose preferences to adjust.
   */
  @Tags('Preferences')
  @Security('ApiKeyAuth')
  @Patch('preferences/{recipient}')
  @Example<PreferencesResponse>(patchPreferencesResponse)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    422,
    '`INVALID_TEMPLATE_BODY` — A preference value was not a boolean. Send only `true` or `false` for `email`, `sms`, and/or `push`, then retry.',
    invalidPreferenceType
  )
  public async patchPreferences(
    @Path() recipient: string,
    @Body() body: PatchPreferencesBody
  ): Promise<PreferencesResponse> {
    return {
      recipient,
      email: body.email ?? true,
      sms: body.sms ?? true,
      push: body.push ?? true,
    };
  }

  /**
   * Clears any stored preferences for the recipient so the defaults apply again (all channels allowed).
   * @summary Reset preferences
   * @param recipient Selects whose stored preferences should be removed.
   */
  @Tags('Preferences')
  @Security('ApiKeyAuth')
  @Delete('preferences/{recipient}')
  @Example<PreferencesResponse>(preferencesAllAllowed)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  public async resetPreferences(@Path() recipient: string): Promise<PreferencesResponse> {
    return { recipient, email: true, sms: true, push: true };
  }

  /**
   * Turns off one channel for a recipient by setting that channel’s preference to `false`.
   * @summary Unsubscribe
   */
  @Tags('Preferences')
  @Security('ApiKeyAuth')
  @Post('unsubscribe')
  @Example<PreferencesResponse>(unsubscribeResponse)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    400,
    '`MISSING_FIELDS` — Required unsubscribe fields were omitted. Include `recipient` and `channel`, then retry.',
    missingFieldsUnsubscribe
  )
  @Response<ApiErrorResponse>(
    422,
    '`INVALID_CHANNEL` — The `channel` value is not supported. Use only `email`, `sms`, or `push`, then retry.',
    invalidChannel
  )
  public async unsubscribe(@Body() body: UnsubscribeRequest): Promise<PreferencesResponse> {
    return {
      recipient: body.recipient,
      email: body.channel === 'email' ? false : true,
      sms: body.channel === 'sms' ? false : true,
      push: body.channel === 'push' ? false : true,
    };
  }

  /**
   * Registers a webhook URL so the mock can associate later [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification) calls with that endpoint.
   *
   * **NOTE**: The service records fake delivery attempts for practice; it does not call the URL.
   * @summary Create webhook
   */
  @Tags('Webhooks')
  @Security('ApiKeyAuth')
  @Post('webhooks')
  @SuccessResponse(201, 'Created')
  @Example<WebhookResponse>(webhook)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    400,
    '`MISSING_FIELDS` — The `url` field was omitted. Provide an `http://` or `https://` callback URL, then retry.',
    missingFieldsWebhook
  )
  @Response<ApiErrorResponse>(
    422,
    '`INVALID_TEMPLATE_BODY` — The `url` is not a valid `http://` or `https://` address. Correct `url` and retry.',
    invalidWebhookUrl
  )
  public async createWebhook(@Body() body: CreateWebhookRequest): Promise<WebhookResponse> {
    this.setStatus(201);
    return {
      id: 'wh-example01',
      url: body.url,
      events: body.events ?? ['record.delivered'],
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Returns every webhook that is currently registered in the in-memory store.
   * @summary List webhooks
   */
  @Tags('Webhooks')
  @Security('ApiKeyAuth')
  @Get('webhooks')
  @Example<WebhookResponse[]>(webhookList)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  public async listWebhooks(): Promise<WebhookResponse[]> {
    return [
      {
        id: 'wh-example01',
        url: 'https://example.com/hooks/notifications',
        events: ['record.delivered'],
        createdAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Returns the simulated webhook delivery attempts that were recorded after recent [`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification) calls.
   * @summary List webhook deliveries
   */
  @Tags('Webhooks')
  @Security('ApiKeyAuth')
  @Get('webhooks/deliveries')
  @Example<WebhookDeliveryResponse[]>(webhookDeliveryList)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  public async listWebhookDeliveries(): Promise<WebhookDeliveryResponse[]> {
    return [
      {
        id: 'del-example01',
        webhookId: 'wh-example01',
        recordId: 'rec-example01',
        status: 'delivered',
        attemptedAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Looks up one registered webhook by its `id`.
   * @summary Get webhook
   * @param id Selects which webhook to retrieve (for example, `wh-abc123`).
   */
  @Tags('Webhooks')
  @Security('ApiKeyAuth')
  @Get('webhooks/{id}')
  @Example<WebhookResponse>(webhook)
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    404,
    '`WEBHOOK_NOT_FOUND` — No webhook matched this `id`. List webhooks with [`GET /api/v1/webhooks`](https://sophias-hub.github.io/docs-api/#/Webhooks/ListWebhooks), or create one before looking it up.',
    webhookNotFound
  )
  public async getWebhook(@Path() id: string): Promise<WebhookResponse> {
    return {
      id,
      url: 'https://example.com/hooks/notifications',
      events: ['record.delivered'],
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Removes a webhook registration from the in-memory store.
   * @summary Delete webhook
   * @param id Selects which webhook to delete.
   */
  @Tags('Webhooks')
  @Security('ApiKeyAuth')
  @Delete('webhooks/{id}')
  @SuccessResponse(204, 'No Content')
  @Response<ApiErrorResponse>(
    401,
    '`UNAUTHORIZED` — Missing or invalid API key. Send header `X-API-Key` with demo value `secure-token-123` and retry.',
    unauthorized
  )
  @Response<ApiErrorResponse>(
    404,
    '`WEBHOOK_NOT_FOUND` — No webhook matched this `id`. It may already be deleted; list webhooks to confirm.',
    webhookNotFound
  )
  public async deleteWebhook(@Path() id: string): Promise<void> {
    this.setStatus(204);
  }
}
