import { parseCookie } from 'cookie';
import { AUTH_COOKIE_NAME, verifyToken } from '../services/authService.js';
import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies[AUTH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select('email role').lean();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = { id: String(user._id), email: user.email, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
