import { Big } from 'big.js';
import { intersection, take, uniq, uniqBy } from 'lodash';
import { IMarketDataClient } from './index.d';
import { IPriceClient } from './IPriceClient';
import logger from './logger';

interface VWAPEntry {
  timestamp: number;
  volume: string;
  price: string;
}

export interface VWAPItem {
  volume: Big;
  price: Big;
}

export default class VWAPExchangeRateClient implements IPriceClient {

  public static calculateVWAP(entries: VWAPItem[]): VWAPItem {
    const volume = entries.reduce(((acc: Big, { volume: v }) => acc.plus(v)), new Big(0));
    const price = entries.reduce(((acc: Big, { price: p, volume: v }) => acc.plus(p.mul(v))), new Big(0)).div(volume);
    return {
      price,
      volume
    };
  }

  private readonly client: IMarketDataClient<VWAPEntry>;
  private readonly maxProxyAssets: number;
  private readonly limit: number;

  constructor(client: IMarketDataClient<VWAPEntry>, limit: number = 600, maxProxyAssets: number = 5) {
    this.client = client;
    this.limit = limit;
    this.maxProxyAssets = maxProxyAssets;
  }

  public async getPrice(baseAsset: string, quoteAsset: string, interval: string) {
    // 1. Identify all assets traded both toward quote and base assets in the "right" direction
    const proxyAssets = await this.fetchProxyAssets(baseAsset, quoteAsset);
    logger.debug({ proxyAssets, baseAsset, quoteAsset });
    // 2. Fetch most recent price and volume for each base > proxy > quote
    // (note: would be more sane to make sure timestamps match across)
    const constituents = await Promise.all(proxyAssets.map(async proxyAsset =>
      proxyAsset === quoteAsset
        ? await this.fetchDirectSpotExchangeRate(baseAsset, quoteAsset, interval)
        : await this.fetchRate(baseAsset, proxyAsset, quoteAsset, interval)
    ));
    logger.debug(constituents);
    // 3. VWAP it. Volume expressed in quote asset.
    const vwap = VWAPExchangeRateClient.calculateVWAP(constituents);
    logger.debug({
      proxyAssets,
      constituents,
      vwap
    });
    return vwap.price;
  }

  public async fetchRate(baseAsset: string, proxyAsset: string, quoteAsset: string, interval: string) {
    const [baseInProxy, proxyInQuote] = await Promise.all([
      this.fetchDirectSpotExchangeRate(baseAsset, proxyAsset, interval),
      this.fetchDirectSpotExchangeRate(proxyAsset, quoteAsset, interval)
    ]);
    return {
      volume: proxyInQuote.volume.eq(0) ? proxyInQuote.volume : baseInProxy.volume,
      price: baseInProxy.price.mul(proxyInQuote.price)
    };
  }

  public async fetchSpotPairs(): Promise<Pair[]> {
    const instruments = await this.client.fetchInstruments();
    const spotInstruments = instruments.filter(i => i.class === 'spot');
    return uniqBy(
        spotInstruments,
        ({ quote_asset, base_asset }) => `${base_asset}-${quote_asset}`
      ).map(i => ({
        baseAsset: i.base_asset,
        quoteAsset: i.quote_asset
      }));
  }

  // Returns all assets traded both to quote asset and base asset
  public async fetchProxyAssets(baseAsset: string, quoteAsset: string): Promise<string[]> {
    const allPairs = await this.fetchSpotPairs();
    logger.debug({ allPairs });
    const baseMatchAssets = allPairs.filter(p => p.baseAsset === baseAsset && !!p.quoteAsset).map(p => p.quoteAsset);
    logger.debug({ baseMatchAssets });
    const quoteMatchAssets = allPairs.filter(p => p.quoteAsset === quoteAsset && !!p.baseAsset).map(p => p.baseAsset);
    logger.debug({ quoteMatchAssets });
    const matchingAssets = intersection(baseMatchAssets, quoteMatchAssets).filter(a => a !== baseAsset);
    logger.debug({ matchingAssets });
    const directPair = allPairs.find(p => p.baseAsset === baseAsset && p.quoteAsset === quoteAsset);
    logger.debug({ directPair });
    if (directPair) {
      matchingAssets.unshift(quoteAsset);
    }
    logger.debug({
      allPairs,
      baseMatchAssets,
      quoteMatchAssets,
      directPair,
      matchingAssets,
    });
    return take(
      uniq(matchingAssets),
      this.maxProxyAssets
    );
  }

  protected async fetchDirectSpotExchangeRate(baseAsset: string, quoteAsset: string, interval: string) {
    const rates = await this.client.fetchMarketData(
      `v1/data/trades.v1/spot_direct_exchange_rate/${baseAsset}/${quoteAsset}/recent`,
       {
         interval,
         limit: this.limit
       });
    const rate = rates.find(r => r.price !== null);
    return {
      volume: new Big(rate?.volume || 0),
      price: new Big(rate?.price || 0)
    };
  }
}
interface Pair {
  quoteAsset: string;
  baseAsset: string;
}
