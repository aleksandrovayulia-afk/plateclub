import { getDatabase } from '@netlify/database';
import { createApp } from '../../server/app.mjs';

let handle;
export default async (req, context) => {
  if (!handle) handle = createApp({ pool: getDatabase().pool, env: process.env });
  return handle(req, { ip: context.ip });
};

export const config = { path: '/api/*' };
