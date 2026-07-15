import { User } from '../models/User.js';
import {
  comparePassword,
  signToken,
  buildAuthCookie,
  buildClearAuthCookie,
} from '../services/authService.js';

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    res.setHeader('Set-Cookie', buildAuthCookie(token));
    return res.json({ id: String(user._id), email: user.email });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export async function logout(_req, res) {
  res.setHeader('Set-Cookie', buildClearAuthCookie());
  return res.status(204).end();
}

export async function me(req, res) {
  return res.json({ id: req.user.id, email: req.user.email });
}
