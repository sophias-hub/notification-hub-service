/**
 * Stable API error shape used by the mock service and documented in the hub.
 */
export interface ApiErrorBody {
  error: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly error: string;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    error: string,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }

  toJSON(): ApiErrorBody {
    const body: ApiErrorBody = {
      error: this.error,
      code: this.code,
      message: this.message,
    };
    if (this.details !== undefined) {
      body.details = this.details;
    }
    return body;
  }
}

export const Errors = {
  unauthorized: () =>
    new ApiError(
      401,
      'Unauthorized',
      'UNAUTHORIZED',
      'Missing or invalid X-API-Key header.'
    ),

  missingFields: (fields: string[]) =>
    new ApiError(
      400,
      'Bad Request',
      'MISSING_FIELDS',
      `Missing required fields: ${fields.join(', ')}.`,
      { fields }
    ),

  channelOptedOut: (recipient: string, channel: string) =>
    new ApiError(
      403,
      'Forbidden',
      'CHANNEL_OPTED_OUT',
      `Recipient '${recipient}' has opted out of channel '${channel}'.`,
      { recipient, channel }
    ),

  templateNotFound: (id: string) =>
    new ApiError(
      404,
      'NotFound',
      'TEMPLATE_NOT_FOUND',
      `No template with id '${id}'.`,
      { id }
    ),

  recordNotFound: (id: string) =>
    new ApiError(
      404,
      'NotFound',
      'RECORD_NOT_FOUND',
      `No record with id '${id}'.`,
      { id }
    ),

  webhookNotFound: (id: string) =>
    new ApiError(
      404,
      'NotFound',
      'WEBHOOK_NOT_FOUND',
      `No webhook with id '${id}'.`,
      { id }
    ),

  templateInUse: (id: string) =>
    new ApiError(
      409,
      'Conflict',
      'TEMPLATE_IN_USE',
      `Template '${id}' cannot be deleted because it is referenced by recent send records.`,
      { id }
    ),

  invalidChannel: (channel: string) =>
    new ApiError(
      422,
      'Unprocessable Entity',
      'INVALID_CHANNEL',
      `Channel '${channel}' is not supported. Use email, sms, or push.`,
      { channel, allowed: ['email', 'sms', 'push'] }
    ),

  invalidTemplateBody: (reason: string, details?: Record<string, unknown>) =>
    new ApiError(
      422,
      'Unprocessable Entity',
      'INVALID_TEMPLATE_BODY',
      reason,
      details
    ),

  rateLimited: (retryAfterSeconds: number) =>
    new ApiError(
      429,
      'Too Many Requests',
      'RATE_LIMITED',
      `Too many send requests. Retry after ${retryAfterSeconds} seconds.`,
      { retryAfterSeconds }
    ),
};
