import { Big } from 'big.js';
import { IMarketDataClient } from './index.d';
import { IPriceClient } from './IPriceClient';

interface ExchangeRateEntry {
  timestamp: number;
  price: string;
}

export default class SpotExchangeRateClient implements IPriceClient {
  private client: IMarketDataClient<ExchangeRateEntry>;
  constructor(client: IMarketDataClient<ExchangeRateEntry>) {
    this.client = client;
  }
  public async getPrice(base: string, quote: string, interval: string) {
    const rates = await this.client.fetchMarketData(
      `v1/data/trades.v1/spot_direct_exchange_rate/${base}/${quote}/recent`,
       {
         interval,
       });
    const rate = rates.find(r => r.price !== null);
    return new Big(rate.price);
  }
}
