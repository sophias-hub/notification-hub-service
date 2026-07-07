/**
 * Interface representing the structure of a notification template.
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'push';
}

/**
 * Interface representing the successful API response details.
 */
export interface NotificationResponse {
  status: string;
  messageId: string;
  processedAt: string;
}

/**
 * Core client class for integrating and interacting with the Notification Hub service.
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
   * Creates an instance of NotificationClient.
   * 
   * @param apiKey - The secret authorization key (X-API-Key) used to access the API.
   * @param baseUrl - The base URL of the running notification service (defaults to http://localhost:3000).
   */
  constructor(apiKey: string, baseUrl: string = 'http://localhost:3000') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash if present
  }

  /**
   * Fetches the list of all available notification templates from the system.
   * 
   * @returns A promise resolving to an array of {@link NotificationTemplate} objects.
   * @throws {Error} If the server returns a non-200 OK status code.
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
   * Sends a notification to a specific recipient through the chosen communication channel.
   * 
   * @param recipient - The target recipient (e.g., email address, phone number, or device token).
   * @param channel - The delivery channel ('email', 'sms', or 'push').
   * @param templateId - The unique identifier of the pre-configured template.
   * @param templateData - Dynamic JSON key-value pairs used to populate variables inside the template.
   * 
   * @returns A promise resolving to the {@link NotificationResponse} processing details.
   * @throws {Error} If the validation fails or authentication key is invalid.
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
}
