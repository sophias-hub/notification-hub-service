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
} from 'tsoa';

/** Notification channel. */
export type Channel = 'email' | 'sms' | 'push';

/** Delivery status for a send record. */
export type RecordStatus = 'queued' | 'delivered' | 'failed';

export interface TemplateResponse {
  id: string;
  name: string;
  channel: Channel;
  subject?: string;
  body?: string;
}

export interface CreateTemplateRequest {
  id: string;
  name: string;
  channel: Channel;
  subject?: string;
  body?: string;
}

export interface UpdateTemplateRequest {
  name: string;
  channel: Channel;
  subject?: string;
  body?: string;
}

export interface PatchTemplateRequest {
  name?: string;
  channel?: Channel;
  subject?: string;
  body?: string;
}

export interface SendRequestPayload {
  recipient: string;
  channel: Channel;
  templateId: string;
  templateData?: Record<string, unknown>;
}

export interface SendResponse {
  status: string;
  recordId: string;
  processedAt: string;
}

export interface DeliveryRecordResponse {
  recordId: string;
  recipient: string;
  channel: Channel;
  templateId: string;
  status: RecordStatus;
  processedAt: string;
  templateData?: Record<string, unknown>;
}

export interface PreferencesResponse {
  recipient: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface PreferencesBody {
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface PatchPreferencesBody {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
}

export interface UnsubscribeRequest {
  recipient: string;
  channel: Channel;
}

export interface WebhookResponse {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
}

export interface CreateWebhookRequest {
  url: string;
  events?: string[];
}

export interface WebhookDeliveryResponse {
  id: string;
  webhookId: string;
  recordId: string;
  status: 'delivered' | 'failed';
  attemptedAt: string;
}

export interface ReadyResponse {
  status: string;
  store: {
    templates: number;
    records: number;
    preferences: number;
    webhooks: number;
    deliveries: number;
  };
}

export interface ApiErrorResponse {
  error: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

@Route('api/v1')
export class NotificationController extends Controller {
  /**
   * Readiness check with in-memory store stats.
   * @summary Ready
   */
  @Security('ApiKeyAuth')
  @Get('health/ready')
  public async getReady(): Promise<ReadyResponse> {
    return {
      status: 'ready',
      store: { templates: 3, records: 0, preferences: 0, webhooks: 0, deliveries: 0 },
    };
  }

  /**
   * List available notification templates.
   * @summary List templates
   */
  @Security('ApiKeyAuth')
  @Get('templates')
  public async getTemplates(): Promise<TemplateResponse[]> {
    return [
      { id: 'welcome-email', name: 'Welcome Email Template', channel: 'email' },
      { id: 'otp-sms', name: 'One-Time Password SMS', channel: 'sms' },
      { id: 'payment-push', name: 'Payment Success Push Notification', channel: 'push' },
    ];
  }

  /**
   * Retrieve a single template by id.
   * @summary Get template
   */
  @Security('ApiKeyAuth')
  @Get('templates/{id}')
  @Response<ApiErrorResponse>(404, 'TEMPLATE_NOT_FOUND')
  public async getTemplate(@Path() id: string): Promise<TemplateResponse> {
    return { id, name: 'Example', channel: 'email' };
  }

  /**
   * Create a notification template.
   * @summary Create template
   */
  @Security('ApiKeyAuth')
  @Post('templates')
  @SuccessResponse(201, 'Created')
  @Response<ApiErrorResponse>(400, 'MISSING_FIELDS')
  @Response<ApiErrorResponse>(409, 'TEMPLATE_ID_EXISTS')
  @Response<ApiErrorResponse>(422, 'INVALID_TEMPLATE_BODY')
  public async createTemplate(@Body() body: CreateTemplateRequest): Promise<TemplateResponse> {
    this.setStatus(201);
    return body;
  }

  /**
   * Replace a template.
   * @summary Update template
   */
  @Security('ApiKeyAuth')
  @Put('templates/{id}')
  @Response<ApiErrorResponse>(400, 'MISSING_FIELDS')
  @Response<ApiErrorResponse>(404, 'TEMPLATE_NOT_FOUND')
  @Response<ApiErrorResponse>(422, 'INVALID_CHANNEL')
  public async updateTemplate(
    @Path() id: string,
    @Body() body: UpdateTemplateRequest
  ): Promise<TemplateResponse> {
    return { id, ...body };
  }

  /**
   * Partially update a template.
   * @summary Patch template
   */
  @Security('ApiKeyAuth')
  @Patch('templates/{id}')
  @Response<ApiErrorResponse>(404, 'TEMPLATE_NOT_FOUND')
  @Response<ApiErrorResponse>(422, 'INVALID_TEMPLATE_BODY')
  public async patchTemplate(
    @Path() id: string,
    @Body() body: PatchTemplateRequest
  ): Promise<TemplateResponse> {
    return { id, name: body.name ?? 'Example', channel: body.channel ?? 'email', ...body };
  }

  /**
   * Delete a template.
   * @summary Delete template
   */
  @Security('ApiKeyAuth')
  @Delete('templates/{id}')
  @SuccessResponse(204, 'No Content')
  @Response<ApiErrorResponse>(404, 'TEMPLATE_NOT_FOUND')
  @Response<ApiErrorResponse>(409, 'TEMPLATE_IN_USE')
  public async deleteTemplate(@Path() id: string): Promise<void> {
    this.setStatus(204);
  }

  /**
   * Send a notification using a template.
   * @summary Send notification
   */
  @Security('ApiKeyAuth')
  @Post('send')
  @Response<ApiErrorResponse>(400, 'MISSING_FIELDS')
  @Response<ApiErrorResponse>(403, 'CHANNEL_OPTED_OUT')
  @Response<ApiErrorResponse>(404, 'TEMPLATE_NOT_FOUND')
  @Response<ApiErrorResponse>(422, 'INVALID_CHANNEL')
  @Response<ApiErrorResponse>(429, 'RATE_LIMITED')
  public async sendNotification(@Body() body: SendRequestPayload): Promise<SendResponse> {
    return {
      status: 'success',
      recordId: `rec-${Math.random().toString(36).substring(2, 11)}`,
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * List records, optionally filtered by recipient or status (`queued` | `delivered` | `failed`).
   * @summary List records
   */
  @Security('ApiKeyAuth')
  @Get('records')
  public async listRecords(
    @Query() recipient?: string,
    @Query() status?: string
  ): Promise<DeliveryRecordResponse[]> {
    return [];
  }

  /**
   * Retrieve a record by id.
   * @summary Get record
   */
  @Security('ApiKeyAuth')
  @Get('records/{recordId}')
  @Response<ApiErrorResponse>(404, 'RECORD_NOT_FOUND')
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
   * Delete a record from the store.
   * @summary Delete record
   */
  @Security('ApiKeyAuth')
  @Delete('records/{recordId}')
  @SuccessResponse(204, 'No Content')
  @Response<ApiErrorResponse>(404, 'RECORD_NOT_FOUND')
  public async deleteRecord(@Path() recordId: string): Promise<void> {
    this.setStatus(204);
  }

  /**
   * Retrieve channel preferences for a recipient.
   * @summary Get preferences
   */
  @Security('ApiKeyAuth')
  @Get('preferences/{recipient}')
  public async getPreferences(@Path() recipient: string): Promise<PreferencesResponse> {
    return { recipient, email: true, sms: true, push: true };
  }

  /**
   * Replace channel preferences for a recipient.
   * @summary Set preferences
   */
  @Security('ApiKeyAuth')
  @Put('preferences/{recipient}')
  @Response<ApiErrorResponse>(400, 'MISSING_FIELDS')
  public async setPreferences(
    @Path() recipient: string,
    @Body() body: PreferencesBody
  ): Promise<PreferencesResponse> {
    return { recipient, ...body };
  }

  /**
   * Partially update channel preferences.
   * @summary Patch preferences
   */
  @Security('ApiKeyAuth')
  @Patch('preferences/{recipient}')
  @Response<ApiErrorResponse>(422, 'INVALID_TEMPLATE_BODY')
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
   * Reset preferences to defaults (all channels allowed).
   * @summary Reset preferences
   */
  @Security('ApiKeyAuth')
  @Delete('preferences/{recipient}')
  public async resetPreferences(@Path() recipient: string): Promise<PreferencesResponse> {
    return { recipient, email: true, sms: true, push: true };
  }

  /**
   * Opt a recipient out of a single channel.
   * @summary Unsubscribe
   */
  @Security('ApiKeyAuth')
  @Post('unsubscribe')
  @Response<ApiErrorResponse>(400, 'MISSING_FIELDS')
  @Response<ApiErrorResponse>(422, 'INVALID_CHANNEL')
  public async unsubscribe(@Body() body: UnsubscribeRequest): Promise<PreferencesResponse> {
    return {
      recipient: body.recipient,
      email: body.channel === 'email' ? false : true,
      sms: body.channel === 'sms' ? false : true,
      push: body.channel === 'push' ? false : true,
    };
  }

  /**
   * Register a webhook callback URL.
   * @summary Create webhook
   */
  @Security('ApiKeyAuth')
  @Post('webhooks')
  @SuccessResponse(201, 'Created')
  @Response<ApiErrorResponse>(400, 'MISSING_FIELDS')
  @Response<ApiErrorResponse>(422, 'INVALID_TEMPLATE_BODY')
  public async createWebhook(@Body() body: CreateWebhookRequest): Promise<WebhookResponse> {
    this.setStatus(201);
    return {
      id: 'wh-example',
      url: body.url,
      events: body.events ?? ['record.delivered'],
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * List registered webhooks.
   * @summary List webhooks
   */
  @Security('ApiKeyAuth')
  @Get('webhooks')
  public async listWebhooks(): Promise<WebhookResponse[]> {
    return [];
  }

  /**
   * List fake webhook delivery attempts.
   * @summary List webhook deliveries
   */
  @Security('ApiKeyAuth')
  @Get('webhooks/deliveries')
  public async listWebhookDeliveries(): Promise<WebhookDeliveryResponse[]> {
    return [];
  }

  /**
   * Retrieve a webhook by id.
   * @summary Get webhook
   */
  @Security('ApiKeyAuth')
  @Get('webhooks/{id}')
  @Response<ApiErrorResponse>(404, 'WEBHOOK_NOT_FOUND')
  public async getWebhook(@Path() id: string): Promise<WebhookResponse> {
    return {
      id,
      url: 'https://example.com/hooks',
      events: ['record.delivered'],
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Delete a webhook.
   * @summary Delete webhook
   */
  @Security('ApiKeyAuth')
  @Delete('webhooks/{id}')
  @SuccessResponse(204, 'No Content')
  @Response<ApiErrorResponse>(404, 'WEBHOOK_NOT_FOUND')
  public async deleteWebhook(@Path() id: string): Promise<void> {
    this.setStatus(204);
  }
}
