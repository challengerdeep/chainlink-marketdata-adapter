import axios from 'axios';
import { URLSearchParams } from 'url';
import ClientError from './ClientError';
import { IMarketDataClient, Instrument } from './index.d';
import logger from './logger';

export default class MarketDataClient<S> implements IMarketDataClient<S> {
  private readonly BASE_URL: string;
  private readonly REFERENCE_DATA_URL: string;

  constructor(baseURL = 'https://us.market-api.kaiko.io/', referenceDataURL = 'https://reference-data-api.kaiko.io/') {
    this.BASE_URL = baseURL;
    this.REFERENCE_DATA_URL = referenceDataURL;
  }

  public async fetchInstruments(): Promise<Instrument[]> {
    const url = this.REFERENCE_DATA_URL + 'v1/instruments';
    const instrumentsResponse = await axios.get(url, {
      responseType: 'json'
    });
    logger.info('Forwarding request', {
      url
    });

    return instrumentsResponse.data.data as Instrument[];
  }

  public async fetchMarketData<T extends S>(endpoint: string, querystringParams: {}): Promise<T[]> {
    const url = this.BASE_URL + endpoint;
    const headers = {
      'X-Api-Key': process.env.CUBIT_API_KEY,
      'User-Agent': 'Kaiko Chainlink Exchange Rate Adapter'
    };
    const params = new URLSearchParams(querystringParams);
    logger.info('Forwarding request', {
      url,
      params
    });
    const response = await axios.get(url, {
      headers,
      params,
      responseType: 'json'
    });
    if (response.status >= 400) {
      throw new ClientError(response.status, response.data?.toString());
    }
    return response.data.data as T[];
  }
}
