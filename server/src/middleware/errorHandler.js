export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  // Prisma known errors we can translate into something meaningful.
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'That name is already in use' });
  }
  if (err.code === 'P2003' || err.code === 'P2014') {
    return res.status(409).json({ error: 'This record is still referenced by other data' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (status >= 500) console.error(err);

  // WHY: never leak stack traces or Prisma internals to the client.
  res.status(status).json({
    error: err.expose ? err.message : 'Something went wrong',
  });
}
