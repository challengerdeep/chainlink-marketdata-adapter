import axios from 'axios';
import { Big } from 'big.js';
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
    const proxyAssets = await this.fetchProxyAssets(baseAsset);
    const constituents = await Promise.all(proxyAssets.map(async proxyAsset =>
      proxyAsset === quoteAsset
        ? await this.fetchDirectSpotExchangeRate(baseAsset, quoteAsset, interval)
        : await this.fetchRate(baseAsset, proxyAsset, quoteAsset, interval)
    ));
    const { price } = VWAPExchangeRateClient.calculateVWAP(constituents);
    return price;
  }

  public async fetchRate(baseAsset: string, proxyAsset: string, quoteAsset: string, interval: string) {
    const [baseInProxy, proxyInQuote] = await Promise.all([
      this.fetchDirectSpotExchangeRate(baseAsset, proxyAsset, interval),
      this.fetchDirectSpotExchangeRate(proxyAsset, quoteAsset, interval)
    ]);
    return {
      quoteAsset,
      volume: proxyInQuote.volume.eq(0) ? proxyInQuote.volume : baseInProxy.volume,
      price: baseInProxy.price.mul(proxyInQuote.price)
    };
  }

  private async fetchProxyAssets(baseAsset: string): Promise<string[]> {
    const url = 'https://reference-data-api.kaiko.io/v1/instruments';
    const instrumentsResponse = await axios.get(url, {
      url,
      responseType: 'json'
    });
    logger.info('Forwarding request', {
      url
    });
    const quoteAssets: string[] = Array.from(new Set<string>(instrumentsResponse.data
      .filter((instrument: any) => !!instrument.quote_asset && instrument.base_asset === baseAsset)
      .map((instrument: any) => instrument.quote_asset)))
      .slice(0, this.maxProxyAssets);
    return quoteAssets;
  }

  private async fetchDirectSpotExchangeRate(baseAsset: string, quoteAsset: string, interval: string) {
    const rates = await this.client.fetchMarketData(
      `v1/data/trades.v1/spot_direct_exchange_rate/${baseAsset}/${quoteAsset}/recent`,
       {
         interval,
       });
    return {
      quoteAsset,
      volume: new Big(rates[0]?.volume || 0),
      price: new Big(rates[0]?.price || 0)
    };
  }

}
