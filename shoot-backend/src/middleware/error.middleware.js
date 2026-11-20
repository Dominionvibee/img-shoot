export function notFound(_request, response) {
  response.status(404).json({ error: { message: 'Route not found.' } });
}

export function errorHandler(error, _request, response, _next) {
  if (response.headersSent) return;
  const status = Number.isInteger(error.status) ? error.status : 500;
  response.status(status).json({
    error: { message: status >= 500 ? 'Internal server error.' : error.message },
  });
}
