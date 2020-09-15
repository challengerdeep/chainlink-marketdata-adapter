import { Big } from 'big.js';
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
  private readonly client: IMarketDataClient<VWAPEntry>;
  private readonly limit: number;

  constructor(client: IMarketDataClient<VWAPEntry>, limit: number = 600) {
    this.client = client;
    this.limit = limit;
  }

  public async getPrice(baseAsset: string, quoteAsset: string, interval: string) {
    const price = await this.fetchRate(baseAsset, quoteAsset, interval);
    logger.debug({
      price
    });
    return price;
  }

  public async fetchRate(baseAsset: string, quoteAsset: string, interval: string) {
    const [baseInProxy, proxyInQuote] = await Promise.all([
      this.fetchSpotExchangeRate(baseAsset, interval),
      this.fetchSpotExchangeRate(quoteAsset, interval)
    ]);
    logger.debug({
      baseInProxy,
      proxyInQuote
    })
    return baseInProxy.div(proxyInQuote);
  }

  protected async fetchSpotExchangeRate(baseAsset: string, interval: string) {
    const rates = await this.client.fetchMarketData(
      `v1/data/trades.v1/spot_exchange_rate/${baseAsset}/usd/recent`,
       {
         interval,
         limit: this.limit
       });
    logger.debug(rates);
    const rate = rates.find(r => r.price !== null);
    return new Big(rate?.price)
  }
}
