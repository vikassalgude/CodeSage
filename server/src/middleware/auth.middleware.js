import jwt from 'jsonwebtoken';

/**
 * Verifies the JWT Bearer token and attaches the decoded payload to req.user.
 * Returns 401 if the token is missing or invalid.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Missing or malformed Authorization header' } });
  }

  const token = authHeader.slice(7); // Strip "Bearer "
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, plan }
    next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}
