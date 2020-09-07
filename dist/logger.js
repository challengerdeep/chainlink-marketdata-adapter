"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_winston_1 = require("@google-cloud/logging-winston");
const winston = require("winston");
const loggingWinston = new logging_winston_1.LoggingWinston();
exports.default = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(winston.format.errors({ stack: true }), winston.format.json()),
    transports: process.env.LOG_STACKDRIVER ? [
        new winston.transports.Console(),
        loggingWinston,
    ] : [
        new winston.transports.Console(),
    ]
});
//# sourceMappingURL=logger.js.map