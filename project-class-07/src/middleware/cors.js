// CORS policy for the frontend deliverable (05A). One explicit origin
// from the environment — never "*": this API answers browsers we know,
// with credentials headers we chose.
import 'dotenv/config';

const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN;

export function corsPolicy(req, res, next) {
  const origin = req.headers.origin;

  if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  }

  // Preflight requests end here: they ask for permission, not for data.
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
}
