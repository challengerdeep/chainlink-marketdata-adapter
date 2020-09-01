import logger from '../src/logger';
import { IMarketDataClient, Instrument } from '../src/index.d';

export class MockMarketDataClient<S> implements IMarketDataClient<S>{
  private instruments: Instrument[];
  private response: {
    [endpoint: string]: S[]
  };

  constructor(instruments: Instrument[], response: { [endpoint: string]: S[] }) {
    this.instruments = instruments;
    this.response = response;
  }

  fetchInstruments(): Promise<Instrument[]> {
    return Promise.resolve(this.instruments);
  }

  fetchMarketData<T extends S>(endpoint: string, querystringParams: {}): Promise<T[]> {
    logger.debug({
      endpoint,
      response: this.response
    });
    return Promise.resolve(this.response[endpoint] as T[]);
  }
}
