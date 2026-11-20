import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';

describe('health endpoint', () => {
  after(async () => {
    await mongoose.disconnect();
  });

  it('reports API availability and database connection state', async () => {
    const response = await request(app).get('/api/health').expect(200);
    assert.deepEqual(response.body, {
      service: 'img-shoot-api',
      status: 'ok',
      database: 'disconnected',
    });
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/api/unknown').expect(404);
    assert.deepEqual(response.body, { error: { message: 'Route not found.' } });
  });
});
