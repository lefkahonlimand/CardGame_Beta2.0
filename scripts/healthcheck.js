#!/usr/bin/env node

/**
 * Health check script for Docker containers
 */

import http from 'http';
import { config } from '../src/server/config/index.js';

const options = {
  host: config.host || 'localhost',
  port: config.port || 3000,
  path: '/api/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.error(`Health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error('Health check failed:', err.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('Health check timeout');
  request.destroy();
  process.exit(1);
});

request.end();
