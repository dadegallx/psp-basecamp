import 'server-only';
import { neon } from '@neondatabase/serverless';

if (!process.env.NEON_DATABASE_URL) {
  throw new Error('NEON_DATABASE_URL is not defined');
}

export const sql = neon(process.env.NEON_DATABASE_URL);
