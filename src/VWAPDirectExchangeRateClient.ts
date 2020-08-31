import axios from 'axios';
import { Big } from 'big.js';
import { intersection, take, uniq, uniqBy } from 'lodash';
import { IPriceClient } from './IPriceClient';
import logger from './logger';
import MarketDataClient from './MarketDataClient';

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

  private readonly client: MarketDataClient<VWAPEntry>;
  private readonly maxProxyAssets: number;

  constructor(client: MarketDataClient<VWAPEntry>, maxProxyAssets: number = 5) {
    this.client = client;
    this.maxProxyAssets = maxProxyAssets;
  }

  public async getPrice(baseAsset: string, quoteAsset: string, interval: string) {
    // 1. Identify all assets traded both toward quote and base assets in the "right" direction
    const proxyAssets = await this.fetchProxyAssets(baseAsset, quoteAsset);
    // 2. Fetch most recent price and volume for each base > proxy > quote
    // (note: would be more sane to make sure timestamps match across)
    const constituents = await Promise.all(proxyAssets.map(async proxyAsset =>
      proxyAsset === quoteAsset
        ? await this.fetchDirectSpotExchangeRate(baseAsset, quoteAsset, interval)
        : await this.fetchRate(baseAsset, proxyAsset, quoteAsset, interval)
    ));
    // 3. VWAP it. Volume expressed in quote asset.
    const { price } = VWAPExchangeRateClient.calculateVWAP(constituents);
    return price;
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

  private async fetchSpotPairs(): Promise<Pair[]> {
    const url = 'https://reference-data-api.kaiko.io/v1/instruments';
    const instrumentsResponse = await axios.get(url, {
      url,
      responseType: 'json'
    });
    logger.info('Forwarding request', {
      url
    });
    const spotInstruments = (instrumentsResponse.data.data as Instrument[]).filter(i => i.class === 'spot');
    return uniqBy(
        spotInstruments,
        ({ quote_asset, base_asset }) => `${base_asset}-${quote_asset}`
      ).map(i => ({
        baseAsset: i.base_asset,
        quoteAsset: i.quote_asset
      }));
  }

  // Returns all assets traded both to quote asset and base asset
  private async fetchProxyAssets(baseAsset: string, quoteAsset: string): Promise<string[]> {
    const allPairs = await this.fetchSpotPairs();
    const baseMatchAssets = allPairs.filter(p => p.baseAsset === baseAsset && !!p.quoteAsset).map(p => p.quoteAsset);
    const quoteMatchAssets = allPairs.filter(p => p.quoteAsset === quoteAsset && !!p.baseAsset).map(p => p.baseAsset);
    const matchingAssets = intersection(baseMatchAssets, quoteMatchAssets).filter(a => a !== baseAsset);
    const directPair = allPairs.find(p => p.baseAsset === baseAsset && p.quoteAsset === quoteAsset);
    if (directPair) {
      matchingAssets.unshift(quoteAsset);
    }
    return take(
      uniq(matchingAssets),
      this.maxProxyAssets
    );
  }

  private async fetchDirectSpotExchangeRate(baseAsset: string, quoteAsset: string, interval: string) {
    const rates = await this.client.fetchMarketData(
      `v1/data/trades.v1/spot_direct_exchange_rate/${baseAsset}/${quoteAsset}/recent`,
       {
         interval,
       });
    return {
      volume: new Big(rates[0]?.volume || 0),
      price: new Big(rates[0]?.price || 0)
    };
  }
}
interface Pair {
  quoteAsset: string;
  baseAsset: string;
}

interface Instrument {
  base_asset: string;
  quote_asset: string;
  class: string;
}
