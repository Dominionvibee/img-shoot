import 'dotenv/config';
import { createServer } from 'node:http';
import app from './src/app.js';
import { connectDatabase } from './src/config/database.js';

const port = Number(process.env.PORT) || 4000;
const server = createServer(app);

server.listen(port, '127.0.0.1', () => {
  console.log(`img-shoot API listening on http://localhost:${port}`);
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set; database connection was skipped.');
    return;
  }

  connectDatabase(process.env.MONGODB_URI).catch(() => {
    console.warn('MongoDB connection failed; the API remains available without database access.');
  });
});

const shutdown = (signal) => {
  console.log(`${signal} received; closing API server.`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
