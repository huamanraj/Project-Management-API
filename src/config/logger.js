const winston = require('winston');
const fs = require('fs');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';
// Detect common serverless/Vercel indicators
const isVercel = !!process.env.VERCEL || !!process.env.NOW_REGION || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
// Only write files when not on Vercel/serverless
const canWriteFiles = !isVercel;

const transports = [
  new winston.transports.Console({
    format: isProd
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }),
];

if (canWriteFiles) {
  const logDir = path.join(process.cwd(), 'logs');
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    transports.push(new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }));
    transports.push(new winston.transports.File({ filename: path.join(logDir, 'combined.log') }));
  } catch {
    // If fs is not writable, silently skip file transports
  }
}

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'project-management-api' },
  transports,
});

module.exports = logger;