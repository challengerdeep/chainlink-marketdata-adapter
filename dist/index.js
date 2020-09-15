"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gcpservice = void 0;
const big_js_1 = require("big.js");
const ClientError_1 = require("./ClientError");
const logger_1 = require("./logger");
const MarketDataClient_1 = require("./MarketDataClient");
const SpotDirectExchangeRateClient_1 = require("./SpotDirectExchangeRateClient");
const SpotExchangeRateClient_1 = require("./SpotExchangeRateClient");
const VWAPDirectExchangeRateClient_1 = require("./VWAPDirectExchangeRateClient");
const run = async (input) => {
    logger_1.default.info('Received request', input);
    let base = input.data.base || input.data.from || input.data.coin;
    let quote = input.data.quote || input.data.to || input.data.market;
    if (!base || !base.match(/^[a-zA-Z0-9]+$/)) {
        throw new ClientError_1.default(400, `Invalid or missing base asset ${base}`);
    }
    if (!quote || !quote.match(/^[a-zA-Z0-9]+$/)) {
        throw new ClientError_1.default(400, `Invalid or missing quote asset ${quote}`);
    }
    const doInverse = input.data.do_inverse || base === 'usdt' && quote === 'eth'; // Existing job compatability
    if (doInverse) {
        base = quote.toLowerCase();
        quote = base.toLowerCase();
    }
    else {
        base = base.toLowerCase();
        quote = quote.toLowerCase();
    }
    const client = new MarketDataClient_1.default();
    const agent = ((method) => {
        switch (method) {
            case 'spot_exchange_rate':
                return new SpotExchangeRateClient_1.default(client);
            case 'vwap':
                return new VWAPDirectExchangeRateClient_1.default(client, parseInt(process.env.MAX_QUOTE_ASSETS, 10));
            case 'spot_direct_exchange_rate':
            default:
                return new SpotDirectExchangeRateClient_1.default(client);
        }
    })(input.data.method);
    const price = await agent.getPrice(base, quote, '1m');
    const result = doInverse
        ? new big_js_1.default(1).div(price)
        : price;
    return result;
};
const createResponse = (req, price) => ({
    jobRunID: req.id,
    status: '200',
    data: {
        result: parseFloat(price.round(18, 2 /* RoundHalfEven */).toString())
    }
});
// GCP Cloud Fuction handler
exports.gcpservice = (req, res) => {
    const params = req.body;
    run(params)
        .then(price => {
        if (price) {
            const response = createResponse(params, price);
            return res.status(200).send(response);
        }
    })
        .catch((err) => {
        logger_1.default.error(err.message);
        const response = {
            jobRunID: params.id,
            status: 'errored',
            error: err.message
        };
        return err.name === 'ClientError'
            ? res.status(err.statusCode).send(response)
            : res.status(500).send(response);
    });
};
//# sourceMappingURL=index.js.map