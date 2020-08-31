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

const MAX_QUOTE_ASSETS = process.env.MAX_QUOTE_ASSETS
  ? parseInt(process.env.MAX_QUOTE_ASSETS, 10)
  : 5;

export default class VWAPExchangeRateClient implements IPriceClient {

  private static async fetchQuoteAssets(baseAsset: string): Promise<string[]> {
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
      .slice(0, MAX_QUOTE_ASSETS);
    return quoteAssets;
  }
  private client: MarketDataClient<VWAPEntry>;

  constructor(client: MarketDataClient<VWAPEntry>) {
    this.client = client;
  }

  public async getPrice(base: string, quote: string, interval: string) {
    // TODO: Add non-USD quote support
    const price = await this.calculateRate(base, interval);
    return price;
  }

  public async calculateRate(baseAsset: string, interval: string) {
    const quoteAssets = await VWAPExchangeRateClient.fetchQuoteAssets(baseAsset);
    const constituents = await Promise.all(quoteAssets.map(async quoteAsset =>
      await this.fetchRate(baseAsset, quoteAsset, interval)
    ));
    const { price, volume } = this.calculateVWAP(constituents);
    return price;
  }

  public async fetchRate(baseAsset: string, quoteAsset: string, interval: string) {
    if (quoteAsset === 'usd') {
      return await this.fetchDirectSpotExchangeRate(baseAsset, quoteAsset, interval);
    }
    const [baseQuote, quoteUSD] = await Promise.all([
      this.fetchDirectSpotExchangeRate(baseAsset, quoteAsset, interval),
      this.fetchDirectSpotExchangeRate(quoteAsset, 'usd', interval)
    ]);
    return {
      quoteAsset,
      volume: quoteUSD.volume.eq(0) ? quoteUSD.volume : baseQuote.volume,
      price: baseQuote.price.mul(quoteUSD.price)
    };
  }

  private calculateVWAP(entries: VWAPItem[]): VWAPItem {
    const volume = entries.reduce(((acc: Big, { volume: v }) => acc.plus(v)), new Big(0));
    const price = entries.reduce(((acc: Big, { price: p, volume: v }) => acc.plus(p.mul(v))), new Big(0)).div(volume);
    return {
      price,
      volume
    };
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
