"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const big_js_1 = require("big.js");
class SpotExchangeRateClient {
    constructor(client) {
        this.client = client;
    }
    async getPrice(base, quote, interval) {
        const rates = await this.client.fetchMarketData(`v1/data/trades.v1/spot_direct_exchange_rate/${base}/${quote}/recent`, {
            interval,
        });
        return new big_js_1.Big(rates[0].price);
    }
}
exports.default = SpotExchangeRateClient;
//# sourceMappingURL=SpotDirectExchangeRateClient.js.map