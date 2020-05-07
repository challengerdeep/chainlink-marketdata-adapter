import { LoggingWinston } from '@google-cloud/logging-winston';
import winston = require('winston');

const loggingWinston = new LoggingWinston();

export default winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    // Add Stackdriver Logging
    loggingWinston,
  ],
});
