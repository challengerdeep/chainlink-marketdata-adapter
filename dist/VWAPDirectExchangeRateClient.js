"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const big_js_1 = require("big.js");
const lodash_1 = require("lodash");
const logger_1 = require("./logger");
class VWAPExchangeRateClient {
    constructor(client, limit = 600, maxProxyAssets = 5) {
        this.client = client;
        this.limit = limit;
        this.maxProxyAssets = maxProxyAssets;
    }
    static calculateVWAP(entries) {
        const volume = entries.reduce(((acc, { volume: v }) => acc.plus(v)), new big_js_1.Big(0));
        const price = entries.reduce(((acc, { price: p, volume: v }) => acc.plus(p.mul(v))), new big_js_1.Big(0)).div(volume);
        return {
            price,
            volume
        };
    }
    async getPrice(baseAsset, quoteAsset, interval) {
        // 1. Identify all assets traded both toward quote and base assets in the "right" direction
        const proxyAssets = await this.fetchProxyAssets(baseAsset, quoteAsset);
        logger_1.default.debug({ proxyAssets, baseAsset, quoteAsset });
        // 2. Fetch most recent price and volume for each base > proxy > quote
        // (note: would be more sane to make sure timestamps match across)
        const constituents = await Promise.all(proxyAssets.map(async (proxyAsset) => proxyAsset === quoteAsset
            ? await this.fetchDirectSpotExchangeRate(baseAsset, quoteAsset, interval)
            : await this.fetchRate(baseAsset, proxyAsset, quoteAsset, interval)));
        logger_1.default.debug(constituents);
        // 3. VWAP it. Volume expressed in quote asset.
        const vwap = VWAPExchangeRateClient.calculateVWAP(constituents);
        logger_1.default.debug({
            proxyAssets,
            constituents,
            vwap
        });
        return vwap.price;
    }
    async fetchRate(baseAsset, proxyAsset, quoteAsset, interval) {
        const [baseInProxy, proxyInQuote] = await Promise.all([
            this.fetchDirectSpotExchangeRate(baseAsset, proxyAsset, interval),
            this.fetchDirectSpotExchangeRate(proxyAsset, quoteAsset, interval)
        ]);
        return {
            volume: proxyInQuote.volume.eq(0) ? proxyInQuote.volume : baseInProxy.volume,
            price: baseInProxy.price.mul(proxyInQuote.price)
        };
    }
    async fetchSpotPairs() {
        const instruments = await this.client.fetchInstruments();
        const spotInstruments = instruments.filter(i => i.class === 'spot');
        return lodash_1.uniqBy(spotInstruments, ({ quote_asset, base_asset }) => `${base_asset}-${quote_asset}`).map(i => ({
            baseAsset: i.base_asset,
            quoteAsset: i.quote_asset
        }));
    }
    // Returns all assets traded both to quote asset and base asset
    async fetchProxyAssets(baseAsset, quoteAsset) {
        const allPairs = await this.fetchSpotPairs();
        logger_1.default.debug({ allPairs });
        const baseMatchAssets = allPairs.filter(p => p.baseAsset === baseAsset && !!p.quoteAsset).map(p => p.quoteAsset);
        logger_1.default.debug({ baseMatchAssets });
        const quoteMatchAssets = allPairs.filter(p => p.quoteAsset === quoteAsset && !!p.baseAsset).map(p => p.baseAsset);
        logger_1.default.debug({ quoteMatchAssets });
        const matchingAssets = lodash_1.intersection(baseMatchAssets, quoteMatchAssets).filter(a => a !== baseAsset);
        logger_1.default.debug({ matchingAssets });
        const directPair = allPairs.find(p => p.baseAsset === baseAsset && p.quoteAsset === quoteAsset);
        logger_1.default.debug({ directPair });
        if (directPair) {
            matchingAssets.unshift(quoteAsset);
        }
        logger_1.default.debug({
            allPairs,
            baseMatchAssets,
            quoteMatchAssets,
            directPair,
            matchingAssets,
        });
        return lodash_1.take(lodash_1.uniq(matchingAssets), this.maxProxyAssets);
    }
    async fetchDirectSpotExchangeRate(baseAsset, quoteAsset, interval) {
        const rates = await this.client.fetchMarketData(`v1/data/trades.v1/spot_direct_exchange_rate/${baseAsset}/${quoteAsset}/recent`, {
            interval,
            limit: this.limit
        });
        const rate = rates.find(r => r.price !== null);
        return {
            volume: new big_js_1.Big((rate === null || rate === void 0 ? void 0 : rate.volume) || 0),
            price: new big_js_1.Big((rate === null || rate === void 0 ? void 0 : rate.price) || 0)
        };
    }
}
exports.default = VWAPExchangeRateClient;
//# sourceMappingURL=VWAPDirectExchangeRateClient.js.map