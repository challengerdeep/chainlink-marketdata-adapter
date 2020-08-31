import { Big } from 'big.js';
import { IPriceClient } from './IPriceClient';
import MarketDataClient from './MarketDataClient';

interface ExchangeRateEntry {
  timestamp: number;
  price: string;
}

export default class SpotExchangeRateClient implements IPriceClient {
  private client: MarketDataClient<ExchangeRateEntry>;
  constructor(client: MarketDataClient<ExchangeRateEntry>) {
    this.client = client;
  }
  public async getPrice(base: string, quote: string, interval: string) {
    const rates = await this.client.fetchMarketData(
      `/data/trades.v1/spot_exchange_rate/${base}/${quote}/recent`,
       {
         interval,
       });
    return new Big(rates[0].price);
  }
}
