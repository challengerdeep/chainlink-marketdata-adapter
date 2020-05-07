"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_winston_1 = require("@google-cloud/logging-winston");
const winston = require("winston");
const loggingWinston = new logging_winston_1.LoggingWinston();
exports.default = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.Console(),
        // Add Stackdriver Logging
        loggingWinston,
    ],
});
//# sourceMappingURL=logger.js.map