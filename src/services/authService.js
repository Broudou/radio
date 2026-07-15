import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const AUTH_COOKIE_NAME = 'auth_token';

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function buildAuthCookie(token) {
  const parts = [
    `${AUTH_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildClearAuthCookie() {
  return `${AUTH_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
