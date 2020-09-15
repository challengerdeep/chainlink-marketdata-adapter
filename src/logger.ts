import { LoggingWinston } from '@google-cloud/logging-winston';
import winston = require('winston');

const loggingWinston = new LoggingWinston();

export default winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: process.env.LOG_STACKDRIVER ? [
    new winston.transports.Console(),
    loggingWinston,
  ] : [
    new winston.transports.Console(),
  ]
});

