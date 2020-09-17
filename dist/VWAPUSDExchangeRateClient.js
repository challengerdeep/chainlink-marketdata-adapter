"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const big_js_1 = require("big.js");
const logger_1 = require("./logger");
class VWAPExchangeRateClient {
    constructor(client, limit = 600) {
        this.client = client;
        this.limit = limit;
    }
    async getPrice(baseAsset, quoteAsset, interval) {
        const price = await this.fetchRate(baseAsset, quoteAsset, interval);
        logger_1.default.debug({
            price
        });
        return price;
    }
    async fetchRate(baseAsset, quoteAsset, interval) {
        const [baseInProxy, proxyInQuote] = await Promise.all([
            this.fetchSpotExchangeRate(baseAsset, interval),
            this.fetchSpotExchangeRate(quoteAsset, interval)
        ]);
        logger_1.default.debug({
            baseInProxy,
            proxyInQuote
        });
        return baseInProxy.div(proxyInQuote);
    }
    async fetchSpotExchangeRate(baseAsset, interval) {
        const rates = await this.client.fetchMarketData(`v1/data/trades.v1/spot_exchange_rate/${baseAsset}/usd/recent`, {
            interval,
            limit: this.limit
        });
        logger_1.default.debug(rates);
        const rate = rates.find(r => r.price !== null);
        return new big_js_1.Big(rate === null || rate === void 0 ? void 0 : rate.price);
    }
}
exports.default = VWAPExchangeRateClient;
//# sourceMappingURL=VWAPUSDExchangeRateClient.js.map