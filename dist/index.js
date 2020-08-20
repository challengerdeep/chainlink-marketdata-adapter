"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
const url_1 = require("url");
const logger_1 = require("./logger");
const createRequest = (input, callback) => {
    logger_1.default.info('Received request', input);
    const throwError = (statusCode, error) => callback(statusCode, {
        jobRunID: input.id,
        status: 'errored',
        error
    });
    let base = input.data.base || input.data.from || input.data.coin;
    let quote = input.data.quote || input.data.to || input.data.market;
    if (!base || !base.match(/^[a-zA-Z0-9]+$/)) {
        return throwError(400, 'Invalid base asset');
    }
    if (!quote || !quote.match(/^[a-zA-Z0-9]+$/)) {
        return throwError(400, 'Invalid quote asset');
    }
    base = base.toLowerCase();
    quote = quote.toLowerCase();
    const doInverse = base === 'usdt' && quote === 'eth';
    const url = doInverse
        ? `https://us.market-api.kaiko.io/v1/data/trades.v1/spot_direct_exchange_rate/${quote}/${base}/recent`
        : `https://us.market-api.kaiko.io/v1/data/trades.v1/spot_direct_exchange_rate/${base}/${quote}/recent`;
    const headers = {
        'X-Api-Key': process.env.CUBIT_API_KEY,
        'User-Agent': 'Kaiko Chainlink Exchange Rate Adapter'
    };
    const params = {
        interval: '1m',
    };
    const qs = new url_1.URLSearchParams(params);
    const options = {
        url,
        qs,
        headers,
        json: true
    };
    logger_1.default.info('Forwarding request', {
        jobRunID: input.id,
        url
    });
    request(options, (error, response, body) => {
        logger_1.default.info('Got response', {
            jobRunID: input.id,
            statusCode: response.statusCode,
            error
        });
        if (error || response.statusCode >= 400) {
            callback(response.statusCode, {
                jobRunID: input.id,
                status: 'errored',
                error: body
            });
        }
        else {
            const price = doInverse
                ? (1 / body.data[0].price)
                : body.data[0].price;
            callback(response.statusCode, {
                jobRunID: input.id,
                data: price
            });
        }
    });
};
exports.gcpservice = (req, res) => {
    createRequest(req.body, (statusCode, data) => {
        res.status(statusCode).send(data);
    });
};
exports.handler = (event, context, callback) => {
    createRequest(event, (statusCode, data) => {
        callback(null, data);
    });
};
module.exports.createRequest = createRequest;
//# sourceMappingURL=index.js.map