"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const url_1 = require("url");
const ClientError_1 = require("./ClientError");
const logger_1 = require("./logger");
class MarketDataClient {
    constructor(baseURL = 'https://us.market-api.kaiko.io/', referenceDataURL = 'https://reference-data-api.kaiko.io/') {
        this.BASE_URL = baseURL;
        this.REFERENCE_DATA_URL = referenceDataURL;
    }
    async fetchInstruments() {
        const url = this.REFERENCE_DATA_URL + 'v1/instruments';
        const instrumentsResponse = await axios_1.default.get(url, {
            responseType: 'json'
        });
        logger_1.default.info('Forwarding request', {
            url
        });
        return instrumentsResponse.data.data;
    }
    async fetchMarketData(endpoint, querystringParams) {
        var _a;
        const url = this.BASE_URL + endpoint;
        const headers = {
            'X-Api-Key': process.env.CUBIT_API_KEY,
            'User-Agent': 'Kaiko Chainlink Exchange Rate Adapter'
        };
        const params = new url_1.URLSearchParams(querystringParams);
        logger_1.default.info('Forwarding request', {
            url,
            params
        });
        const response = await axios_1.default.get(url, {
            headers,
            params,
            responseType: 'json'
        });
        if (response.status >= 400) {
            throw new ClientError_1.default(response.status, (_a = response.data) === null || _a === void 0 ? void 0 : _a.toString());
        }
        return response.data.data;
    }
}
exports.default = MarketDataClient;
//# sourceMappingURL=MarketDataClient.js.map