import express from 'express';
import helmet from 'helmet';
import healthRoutes from './routes/health.routes.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';
import { createRecaptchaRoutes } from './routes/recaptcha.routes.js';

export function createApp(recaptchaOptions) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use('/api', createRecaptchaRoutes(recaptchaOptions));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/health', healthRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export default createApp();
