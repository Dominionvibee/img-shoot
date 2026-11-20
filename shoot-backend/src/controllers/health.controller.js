import { getDatabaseStatus } from '../config/database.js';

export function getHealth(_request, response) {
  response.status(200).json({
    service: 'img-shoot-api',
    status: 'ok',
    database: getDatabaseStatus(),
  });
}
