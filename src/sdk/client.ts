/**
 * Represents the notification template structure.
 */
export interface NotificationTemplate {
  /**
   * Human-readable template ID.
   *
   * @example 'welcome-email'
   */
  id: string;

  /**
   * A descriptive, human-readable template name.
   *
   * @example 'Welcome Email Template'
   */
  name: string;

  /**
   * Channel for which the notification template is intended.\
   * Must be exactly 'email', 'sms', or 'push'.
   *
   * @example 'email'
   */
  channel: 'email' | 'sms' | 'push';
}

/**
 * Represents the successful API response metadata.
 */
export interface NotificationResponse {
  /**
   * Status message.
   *
   * @example 'success'
   */
  status: string;

  /**
   * Response message ID.
   *
   * @example 'msg-e45dyfoas'
   */
  messageId: string;

  /**
   * Notification processing timestamp (UTC ISO-8601).
   *
   * @example '2026-07-07T16:55:07.816Z'
   */
  processedAt: string;
}

/**
 * Core client class for integrating, authenticating, and interacting with the central Notification Hub service.
 * 
 * @example
 * ```typescript
 * const client = new NotificationClient('secure-token-123', 'http://localhost:3000');
 * ```
 */
export class NotificationClient {
  /**
   * Authorization key used to authenticate API requests.
   * @private
   */
  private apiKey: string;

  /**
   * Target base URL of the running notification service instance.
   * @private
   */
  private baseUrl: string;

  /**
   * Creates an instance of the NotificationClient to manage service connections.
   * 
   * @param apiKey - The secret authorization token passed to the server via the `X-API-Key` header.
   * @param baseUrl - The target URL of the running notification service.
   */
  constructor(apiKey: string, baseUrl: string = 'http://localhost:3000') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash if present
  }

  /**
   * Fetches all available (mocked) notification templates.
   * 
   * @returns An array of {@link NotificationTemplate} objects.
   */
  async getTemplates(): Promise<NotificationTemplate[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/templates`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to fetch templates: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return response.json() as Promise<NotificationTemplate[]>;
  }

  /**
   * Dispatches a single template-driven notification to a specified recipient over a designated channel.
   * 
   * @param recipient - The destination address for the message (e.g., an email address, phone number, or device push token).
   * @param channel - The transmission vector to use ('email', 'sms', or 'push').
   * @param templateId - The unique system identifier of the template to render.
   * @param templateData - Key-value metadata mappings used to interpolate variable placeholders inside the template.
   * 
   * @returns The {@link NotificationResponse} object with transaction tracking parameters.
   */
  async sendNotification(
    recipient: string,
    channel: 'email' | 'sms' | 'push',
    templateId: string,
    templateData: Record<string, any> = {}
  ): Promise<NotificationResponse> {
    const payload = {
      recipient,
      channel,
      templateId,
      templateData,
    };

    const response = await fetch(`${this.baseUrl}/api/v1/send`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to send notification: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return response.json() as Promise<NotificationResponse>;
  }

  /**
   * Sends a simple raw string payload directly to a channel.
   * @deprecated Use {@link sendNotification} instead to send template-backed messages.
   * 
   * @param recipient - The destination address for the text string.
   * @param channel - The transmission vector to use ('email', 'sms', or 'push').
   * @param rawMessage - The unformatted string payload body.
   * 
   * @returns A {@link NotificationResponse} object.
   */
  async send(
    recipient: string,
    channel: 'email' | 'sms' | 'push',
    rawMessage: string
  ): Promise<NotificationResponse> {
    return this.sendNotification(recipient, channel, 'legacy-raw-template', { body: rawMessage });
  }
}
