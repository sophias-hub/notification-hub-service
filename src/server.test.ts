import request from 'supertest';
import { app, server, store } from './server.js';

const VALID_API_KEY = 'secure-token-123';
const auth = { 'X-API-Key': VALID_API_KEY };

beforeEach(() => {
  store.reset();
});

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

  describe('GET /api/v1/health/ready', () => {
    it('should return store stats when authenticated', async () => {
      const res = await request(app).get('/api/v1/health/ready').set(auth);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.store.templates).toBe(3);
    });
  });

  describe('Authentication Middleware', () => {
    it('should return 401 with UNAUTHORIZED code if X-API-Key is missing', async () => {
      const res = await request(app).get('/api/v1/templates');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid X-API-Key header.',
      });
    });

    it('should return 401 if X-API-Key is invalid', async () => {
      const res = await request(app).get('/api/v1/templates').set('X-API-Key', 'wrong-token');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Templates CRUD', () => {
    it('GET /templates lists seeded templates', async () => {
      const res = await request(app).get('/api/v1/templates').set(auth);
      expect(res.status).toBe(200);
      expect(res.body[0]).toHaveProperty('id', 'welcome-email');
    });

    it('GET /templates/:id retrieves one template', async () => {
      const res = await request(app).get('/api/v1/templates/welcome-email').set(auth);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('welcome-email');
    });

    it('GET /templates/:id returns TEMPLATE_NOT_FOUND', async () => {
      const res = await request(app).get('/api/v1/templates/missing').set(auth);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TEMPLATE_NOT_FOUND');
    });

    it('POST /templates creates a template', async () => {
      const res = await request(app)
        .post('/api/v1/templates')
        .set(auth)
        .send({
          id: 'promo-email',
          name: 'Promo Email',
          channel: 'email',
          subject: 'Sale!',
          body: 'Hi {{name}}',
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBe('promo-email');
    });

    it('POST /templates returns TEMPLATE_ID_EXISTS on duplicate', async () => {
      const res = await request(app)
        .post('/api/v1/templates')
        .set(auth)
        .send({ id: 'welcome-email', name: 'Dup', channel: 'email' });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('TEMPLATE_ID_EXISTS');
    });

    it('POST /templates returns INVALID_CHANNEL', async () => {
      const res = await request(app)
        .post('/api/v1/templates')
        .set(auth)
        .send({ id: 'bad-channel', name: 'Bad', channel: 'fax' });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('INVALID_CHANNEL');
    });

    it('POST /templates returns MISSING_FIELDS', async () => {
      const res = await request(app).post('/api/v1/templates').set(auth).send({ id: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('PUT /templates/:id replaces a template', async () => {
      const res = await request(app)
        .put('/api/v1/templates/welcome-email')
        .set(auth)
        .send({ name: 'Welcome Updated', channel: 'email', subject: 'Hi' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Welcome Updated');
    });

    it('PATCH /templates/:id partially updates', async () => {
      const res = await request(app)
        .patch('/api/v1/templates/welcome-email')
        .set(auth)
        .send({ name: 'Patched Name' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Patched Name');
      expect(res.body.channel).toBe('email');
    });

    it('DELETE /templates/:id removes unused template', async () => {
      await request(app)
        .post('/api/v1/templates')
        .set(auth)
        .send({ id: 'temp-delete', name: 'Temp', channel: 'sms' });
      const res = await request(app).delete('/api/v1/templates/temp-delete').set(auth);
      expect(res.status).toBe(204);
    });

    it('DELETE /templates/:id returns TEMPLATE_IN_USE when referenced', async () => {
      await request(app)
        .post('/api/v1/send')
        .set(auth)
        .send({ recipient: 'a@b.com', channel: 'email', templateId: 'welcome-email' });
      const res = await request(app).delete('/api/v1/templates/welcome-email').set(auth);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('TEMPLATE_IN_USE');
    });
  });

  describe('POST /api/v1/send', () => {
    it('returns 200 and a recordId when valid', async () => {
      const res = await request(app)
        .post('/api/v1/send')
        .set(auth)
        .send({
          recipient: 'user@example.com',
          channel: 'email',
          templateId: 'welcome-email',
          templateData: { name: 'Sophie' },
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('recordId');
    });

    it('returns MISSING_FIELDS when incomplete', async () => {
      const res = await request(app)
        .post('/api/v1/send')
        .set(auth)
        .send({ recipient: 'user@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('returns CHANNEL_OPTED_OUT when preference blocks send', async () => {
      await request(app)
        .put('/api/v1/preferences/user@example.com')
        .set(auth)
        .send({ email: false, sms: true, push: true });
      const res = await request(app)
        .post('/api/v1/send')
        .set(auth)
        .send({ recipient: 'user@example.com', channel: 'email', templateId: 'welcome-email' });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CHANNEL_OPTED_OUT');
    });

    it('returns TEMPLATE_NOT_FOUND for unknown template', async () => {
      const res = await request(app)
        .post('/api/v1/send')
        .set(auth)
        .send({ recipient: 'user@example.com', channel: 'email', templateId: 'nope' });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TEMPLATE_NOT_FOUND');
    });

    it('returns RATE_LIMITED after too many sends', async () => {
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/send')
          .set(auth)
          .send({
            recipient: `user${i}@example.com`,
            channel: 'email',
            templateId: 'welcome-email',
          });
      }
      const res = await request(app)
        .post('/api/v1/send')
        .set(auth)
        .send({
          recipient: 'overflow@example.com',
          channel: 'email',
          templateId: 'welcome-email',
        });
      expect(res.status).toBe(429);
      expect(res.body.code).toBe('RATE_LIMITED');
      expect(res.headers['retry-after']).toBeDefined();
    });
  });

  describe('Records', () => {
    it('GET /records/:id retrieves a sent record', async () => {
      const send = await request(app)
        .post('/api/v1/send')
        .set(auth)
        .send({ recipient: 'a@b.com', channel: 'email', templateId: 'welcome-email' });
      const res = await request(app)
        .get(`/api/v1/records/${send.body.recordId}`)
        .set(auth);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('delivered');
    });

    it('GET /records filters records by recipient', async () => {
      await request(app)
        .post('/api/v1/send')
        .set(auth)
        .send({ recipient: 'filter@b.com', channel: 'email', templateId: 'welcome-email' });
      const res = await request(app)
        .get('/api/v1/records')
        .query({ recipient: 'filter@b.com' })
        .set(auth);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('DELETE /records/:id removes a record', async () => {
      const send = await request(app)
        .post('/api/v1/send')
        .set(auth)
        .send({ recipient: 'a@b.com', channel: 'email', templateId: 'welcome-email' });
      const res = await request(app)
        .delete(`/api/v1/records/${send.body.recordId}`)
        .set(auth);
      expect(res.status).toBe(204);
    });

    it('GET /records/:id returns RECORD_NOT_FOUND', async () => {
      const res = await request(app).get('/api/v1/records/rec-missing').set(auth);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('RECORD_NOT_FOUND');
    });
  });

  describe('Preferences', () => {
    it('GET returns defaults when unset', async () => {
      const res = await request(app).get('/api/v1/preferences/new@user.com').set(auth);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        recipient: 'new@user.com',
        email: true,
        sms: true,
        push: true,
      });
    });

    it('PUT replaces preferences', async () => {
      const res = await request(app)
        .put('/api/v1/preferences/new@user.com')
        .set(auth)
        .send({ email: true, sms: false, push: true });
      expect(res.status).toBe(200);
      expect(res.body.sms).toBe(false);
    });

    it('PATCH partially updates preferences', async () => {
      await request(app)
        .put('/api/v1/preferences/new@user.com')
        .set(auth)
        .send({ email: true, sms: true, push: true });
      const res = await request(app)
        .patch('/api/v1/preferences/new@user.com')
        .set(auth)
        .send({ push: false });
      expect(res.status).toBe(200);
      expect(res.body.push).toBe(false);
      expect(res.body.email).toBe(true);
    });

    it('DELETE resets to defaults', async () => {
      await request(app)
        .put('/api/v1/preferences/new@user.com')
        .set(auth)
        .send({ email: false, sms: false, push: false });
      const res = await request(app).delete('/api/v1/preferences/new@user.com').set(auth);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(true);
    });

    it('POST /unsubscribe opts out of a channel', async () => {
      const res = await request(app)
        .post('/api/v1/unsubscribe')
        .set(auth)
        .send({ recipient: 'u@x.com', channel: 'sms' });
      expect(res.status).toBe(200);
      expect(res.body.sms).toBe(false);
    });
  });

  describe('Webhooks', () => {
    it('POST creates a webhook', async () => {
      const res = await request(app)
        .post('/api/v1/webhooks')
        .set(auth)
        .send({ url: 'https://example.com/hook' });
      expect(res.status).toBe(201);
      expect(res.body.url).toBe('https://example.com/hook');
    });

    it('GET list and get by id', async () => {
      const created = await request(app)
        .post('/api/v1/webhooks')
        .set(auth)
        .send({ url: 'https://example.com/hook' });
      const list = await request(app).get('/api/v1/webhooks').set(auth);
      expect(list.body.length).toBe(1);
      const one = await request(app).get(`/api/v1/webhooks/${created.body.id}`).set(auth);
      expect(one.status).toBe(200);
      expect(one.body.id).toBe(created.body.id);
    });

    it('records deliveries after send', async () => {
      await request(app)
        .post('/api/v1/webhooks')
        .set(auth)
        .send({ url: 'https://example.com/hook' });
      await request(app)
        .post('/api/v1/send')
        .set(auth)
        .send({ recipient: 'a@b.com', channel: 'email', templateId: 'welcome-email' });
      const res = await request(app).get('/api/v1/webhooks/deliveries').set(auth);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('DELETE removes a webhook', async () => {
      const created = await request(app)
        .post('/api/v1/webhooks')
        .set(auth)
        .send({ url: 'https://example.com/hook' });
      const res = await request(app).delete(`/api/v1/webhooks/${created.body.id}`).set(auth);
      expect(res.status).toBe(204);
    });

    it('GET unknown webhook returns WEBHOOK_NOT_FOUND', async () => {
      const res = await request(app).get('/api/v1/webhooks/wh-missing').set(auth);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('WEBHOOK_NOT_FOUND');
    });
  });

  describe('Learning path flow', () => {
    it('create → retrieve → prefer → send', async () => {
      const created = await request(app)
        .post('/api/v1/templates')
        .set(auth)
        .send({
          id: 'onboarding-email',
          name: 'Onboarding',
          channel: 'email',
          body: 'Welcome {{name}}',
        });
      expect(created.status).toBe(201);

      const retrieved = await request(app)
        .get('/api/v1/templates/onboarding-email')
        .set(auth);
      expect(retrieved.status).toBe(200);
      expect(retrieved.body.name).toBe('Onboarding');

      const prefs = await request(app)
        .put('/api/v1/preferences/learner@example.com')
        .set(auth)
        .send({ email: true, sms: false, push: false });
      expect(prefs.status).toBe(200);

      const sent = await request(app)
        .post('/api/v1/send')
        .set(auth)
        .send({
          recipient: 'learner@example.com',
          channel: 'email',
          templateId: 'onboarding-email',
          templateData: { name: 'Alex' },
        });
      expect(sent.status).toBe(200);
      expect(sent.body.recordId).toBeDefined();
    });
  });
});
