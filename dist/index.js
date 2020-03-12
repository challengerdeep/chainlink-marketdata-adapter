"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
const url_1 = require("url");
const logger_1 = require("./logger");
// valid variations:
// https://<eu|us>.market-api.kaiko.io/v1/data/trades.v1/exchanges/cbse/spot/btc-usd/aggregations/ohlcv/recent
// https://<eu|us>.market-api.kaiko.io/v1/data/trades.v1/exchanges/cbse/spot/btc-usd/aggregations/vwap/recent'
// https://<eu|us>.market-api.kaiko.io/v1/data/trades.v1/exchanges/cbse/spot/btc-usd/aggregations/count_ohlcv_vwap/recent
// https://<eu|us>.market-api.kaiko.io/v1/data/trades.v1/spot_direct_exchange_rate/link/usdt/recent?interval=1m&limit=2
const validateRegion = v => v && ['eu', 'us'].includes(v);
const validateEndpoint = v => v && !!v.match(/^v1\/data\/trades\.v[0-9]+\/(exchanges\/[^?\/]+\/[^?\/]+\/[^?\/]+\/aggregations\/[^?\/]+|spot_direct_exchange_rate\/[^?\/]+\/[^?\/]+)\/recent$/);
const validateParams = v => v && !!v.match(/^[\x00-\x7F]*$/);
const createRequest = (input, callback) => {
    logger_1.default.info('Received request', input);
    const throwError = (statusCode, error) => callback(statusCode, {
        jobRunID: input.id,
        status: 'errored',
        error
    });
    const { region, endpoint } = input.data;
    const params = input.data.params.replace('limit=1', 'limit=50');
    if (!validateRegion(region)) {
        return throwError(400, 'Invalid region');
    }
    if (!validateEndpoint(endpoint)) {
        return throwError(400, 'Invalid endpoint');
    }
    if (!validateParams(params)) {
        return throwError(400, 'Invalid params');
    }
    const url = `https://eu.market-api.kaiko.io/${endpoint}?${params}`;
    const headers = {
        'X-Api-Key': process.env.CUBIT_API_KEY,
        'User-Agent': 'Kaiko Chainlink Adapter'
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
            callback(response.statusCode, {
                jobRunID: input.id,
                data: body
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