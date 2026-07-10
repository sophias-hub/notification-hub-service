import request from 'supertest';
import { app, server } from './server';

const VALID_API_KEY = 'secure-token-123';

// Clean up server instances after tests finish so Jest exits cleanly
afterAll((done) => {
  if (server && server.listening) {
    server.close(done);
  } else {
    done();
  }
});

describe('Notification Hub API Endpoints', () => {

  describe('GET /health', () => {
    it('should return 200 without authentication', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });
  
  describe('Authentication Middleware', () => {
    it('should return 401 Unauthorized if X-API-Key header is missing', async () => {
      const res = await request(app).get('/api/v1/templates');
      
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'Unauthorized',
        message: 'Missing or invalid X-API-Key header.'
      });
    });

    it('should return 401 Unauthorized if X-API-Key is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/templates')
        .set('X-API-Key', 'wrong-token');
      
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/templates', () => {
    it('should return 200 and list of templates when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/templates')
        .set('X-API-Key', VALID_API_KEY);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('id', 'welcome-email');
    });
  });

  describe('POST /api/v1/send', () => {
    it('should return 200 and a messageId when valid payload is sent', async () => {
      const payload = {
        recipient: 'user@example.com',
        channel: 'email',
        templateId: 'welcome-email',
        templateData: { name: 'Sophie' }
      };

      const res = await request(app)
        .post('/api/v1/send')
        .set('X-API-Key', VALID_API_KEY)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('messageId');
      expect(res.body).toHaveProperty('processedAt');
    });

    it('should return 400 Bad Request if mandatory fields are missing', async () => {
      const invalidPayload = {
        recipient: 'user@example.com'
      };

      const res = await request(app)
        .post('/api/v1/send')
        .set('X-API-Key', VALID_API_KEY)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'Bad Request',
        message: 'Missing required fields: recipient, channel, and templateId are required.'
      });
    });
  });
});
