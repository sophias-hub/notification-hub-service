import { Controller, Route, Get, Post, Body, SuccessResponse, Response, Security } from 'tsoa';

interface TemplateResponse {
  id: string;
  name: string;
  channel: string;
}

interface SendRequestPayload {
  recipient: string;
  channel: string;
  templateId: string;
  templateData?: Record<string, any>;
}

@Route("api/v1")
export class NotificationController extends Controller {

  /**
   * Returns an array of available mock notification templates.
   * 
   * @summary 📋 Get Templates
   */
  @Security("ApiKeyAuth") // 🔒 Locks this route down in the UI representation
  @Get("templates")
  public async getTemplates(): Promise<TemplateResponse[]> {
    return [
      { id: 'welcome-email', name: 'Welcome Email Template', channel: 'email' },
      { id: 'otp-sms', name: 'One-Time Password SMS', channel: 'sms' },
      { id: 'payment-push', name: 'Payment Success Push Notification', channel: 'push' }
    ];
  }

  /**
   * Accepts JSON payload to simulate sending a notification.
   * 
   * @summary ✉️ Send Notification
   */
  @Security("ApiKeyAuth") // 🔒 Locks this route down in the UI representation
  @Post("send")
  @Response(400, "Bad Request")
  public async sendNotification(
    @Body() requestBody: SendRequestPayload
  ): Promise<{ status: string; messageId: string; processedAt: string }> {
    return {
      status: 'success',
      messageId: `msg-${Math.random().toString(36).substr(2, 9)}`,
      processedAt: new Date().toISOString()
    };
  }
}
