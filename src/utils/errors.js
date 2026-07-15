export function handleControllerError(res, err, label) {
  console.error(`${label} error:`, err);
  const statusCode = err.statusCode || 500;
  const message = statusCode < 500 ? err.message : 'Server error';
  res.status(statusCode).json({ error: message });
}
