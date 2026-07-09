import type { Request } from 'express';

export async function expressAuthentication(
  request: Request,
  securityName: string,
  _scopes?: string[]
): Promise<void> {
  if (securityName !== 'ApiKeyAuth') return;

  const apiKey = request.header('X-API-Key');
  const VALID_API_KEY = 'secure-token-123';

  if (!apiKey || apiKey !== VALID_API_KEY) {
    throw new Error('Unauthorized');
  }
}

