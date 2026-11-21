import express from 'express';
import {readRecaptchaConfig} from '../config/recaptcha.js';
import {createRecaptchaVerifier} from '../services/recaptcha.service.js';

export function createRecaptchaRoutes({config = readRecaptchaConfig(), ...dependencies} = {}) {
  const router = express.Router();
  const verifier = createRecaptchaVerifier({config, ...dependencies});
  router.use((_request, response, next) => {response.set('Cache-Control', 'no-store'); next();});
  router.get('/recaptcha/config', (_request, response) => {
    response.json({siteKey: config.configured ? config.siteKey : '', configured: Boolean(config.configured)});
  });
  router.post('/privacy-requests/verify', express.json({limit: '12kb'}), async (request, response) => {
    if (!request.is('application/json') || !request.body || Array.isArray(request.body)
      || Object.keys(request.body).some(key => key !== 'recaptchaToken')) {
      response.status(400).json({code: 'INVALID_BODY', message: 'Send only the reCAPTCHA response token as JSON.'}); return;
    }
    const result = await verifier.verify({
      token: request.body.recaptchaToken, origin: request.get('Origin'),
      // Do not trust arbitrary X-Forwarded-For or enable trust proxy globally.
      client: request.socket.remoteAddress || 'unknown',
    });
    if (result.status === 429) response.set('Retry-After', '60');
    response.status(result.status).json(result.body);
  });
  router.use((error, _request, response, next) => {
    if (!['entity.parse.failed', 'entity.too.large'].includes(error.type)) {next(error); return;}
    response.status(400).json({code: 'INVALID_BODY', message: 'Send only the reCAPTCHA response token as JSON.'});
  });
  return router;
}
