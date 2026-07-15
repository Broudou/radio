import mongoose from 'mongoose';
import { config } from './config/env.js';

let isConnected = false;

export async function connectDB() {
  if (isConnected) return mongoose.connection;
  await mongoose.connect(config.mongodbUri);
  isConnected = true;
  console.log('MongoDB connected');
  return mongoose.connection;
}
