#!/usr/bin/env node
// Standalone CLI, no ts-node/build step needed: node scripts/seed-admin.mjs <email> <password>
// Manually parses .env (no dotenv dependency here) and defines its own
// minimal inline schema rather than importing the app's Mongoose model.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnv();

  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: node scripts/seed-admin.mjs <email> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters long');
    process.exit(1);
  }

  const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/radio';
  await mongoose.connect(mongodbUri);

  const UserSchema = new mongoose.Schema(
    {
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      password: { type: String, required: true },
      role: { type: String, enum: ['admin'], default: 'admin' },
    },
    { timestamps: true }
  );
  const User = mongoose.models.User ?? mongoose.model('User', UserSchema);

  const hash = await bcrypt.hash(password, 12);
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOneAndUpdate(
    { email: normalizedEmail },
    { email: normalizedEmail, password: hash, role: 'admin' },
    { upsert: true, new: true }
  );

  console.log(`Admin user ready: ${user.email}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('seed-admin failed:', err);
  process.exit(1);
});
