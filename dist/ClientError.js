"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ClientError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.name = 'ClientError';
    }
}
exports.default = ClientError;
//# sourceMappingURL=ClientError.js.map