import Big from 'big.js';

export interface IPriceClient {
  getPrice(base: string, quote: string, interval: string): Promise<Big>;
}
