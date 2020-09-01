/* eslint-env mocha */
/* tslint-env mocha */
import chai = require('chai');
const expect = chai.expect;
import Big from 'big.js';
import VWAPDirectExchangeRateClient from '../src/VWAPDirectExchangeRateClient';
import { MockMarketDataClient } from './util';

describe('VWAPDirectExchangeRateClient', () => {
  describe('getPrice', () => {
    it('returns direct spot exchange rate if only pair', async () => {
      const client = new MockMarketDataClient([
          {
            class: 'spot',
            base_asset: 'btc',
            quote_asset: 'usd'
          },
        ], {
        'v1/data/trades.v1/spot_direct_exchange_rate/btc/usd/recent': [
          { price: '2', volume: '3', timestamp: 123 }
        ],
      });
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.getPrice('btc', 'usd', '1m');
      expect(result).to.deep.equal(new Big('2.0'));
    });

    it('returns rate for single path', async () => {
      const client = new MockMarketDataClient([
        {
          class: 'spot',
          base_asset: 'btc',
          quote_asset: 'usd'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'btc'
        },
      ], {
        'v1/data/trades.v1/spot_direct_exchange_rate/btc/usd/recent': [
          { price: '2', volume: '3', timestamp: 123 }
        ],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/btc/recent': [
          { price: '10', volume: '5', timestamp: 123  }
        ],
      });
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.getPrice('eth', 'usd', '1m');
      expect(result).to.deep.equal(new Big('20.0'));
    });

    it('calculates vwap of single path and direct', async () => {
      const client = new MockMarketDataClient([
        {
          class: 'spot',
          base_asset: 'btc',
          quote_asset: 'usd'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'btc'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'usd'
        },
      ], {
        'v1/data/trades.v1/spot_direct_exchange_rate/btc/usd/recent': [
          { price: '2', volume: '3', timestamp: 123 }
        ],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/btc/recent': [
          { price: '10', volume: '30', timestamp: 123  }
        ],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/usd/recent': [
          { price: '10', volume: '10', timestamp: 123  }
        ],
      });
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.getPrice('eth', 'usd', '1m');
      expect(result).to.deep.equal(new Big('17.5'));
    });

    it('discards direct with null result', async () => {
      const client = new MockMarketDataClient([
        {
          class: 'spot',
          base_asset: 'btc',
          quote_asset: 'usd'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'btc'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'usd'
        },
      ], {
        'v1/data/trades.v1/spot_direct_exchange_rate/btc/usd/recent': [
          { price: '2', volume: '3', timestamp: 123 }
        ],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/btc/recent': [
          { price: '10', volume: '30', timestamp: 123  }
        ],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/usd/recent': [
          { price: null, volume: null, timestamp: 123  }
        ],
      });
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.getPrice('eth', 'usd', '1m');
      expect(result).to.deep.equal(new Big('20'));
    });

    it('discards path will null proxy values', async () => {
      const client = new MockMarketDataClient([
        {
          class: 'spot',
          base_asset: 'btc',
          quote_asset: 'usd'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'btc'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'usd'
        },
      ], {
        'v1/data/trades.v1/spot_direct_exchange_rate/btc/usd/recent': [
          { price: null, volume: null, timestamp: 123 }
        ],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/btc/recent': [
          { price: '10', volume: '30', timestamp: 123  }
        ],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/usd/recent': [
          { price: '123', volume: '9', timestamp: 123  }
        ],
      });
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.getPrice('eth', 'usd', '1m');
      expect(result).to.deep.equal(new Big('123'));
    });
    it('discards path will empty proxy result', async () => {
      const client = new MockMarketDataClient([
        {
          class: 'spot',
          base_asset: 'btc',
          quote_asset: 'usd'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'btc'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'usd'
        },
      ], {
        'v1/data/trades.v1/spot_direct_exchange_rate/btc/usd/recent': [],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/btc/recent': [
          { price: '10', volume: '30', timestamp: 123  }
        ],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/usd/recent': [
          { price: '123', volume: '9', timestamp: 123  }
        ],
      });
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.getPrice('eth', 'usd', '1m');
      expect(result).to.deep.equal(new Big('123'));
    });
    it('discards path will empty base result', async () => {
      const client = new MockMarketDataClient([
        {
          class: 'spot',
          base_asset: 'btc',
          quote_asset: 'usd'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'btc'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'usd'
        },
      ], {
        'v1/data/trades.v1/spot_direct_exchange_rate/btc/usd/recent': [
          { price: '10', volume: '30', timestamp: 123  }
        ],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/btc/recent': [],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/usd/recent': [
          { price: '123', volume: '9', timestamp: 123  }
        ],
      });
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.getPrice('eth', 'usd', '1m');
      expect(result).to.deep.equal(new Big('123'));
    });
  });
  describe('fetchRate', () => {
    it('aggregates two rates into one with volume = base volume', async () => {
      const client = new MockMarketDataClient(undefined, {
        'v1/data/trades.v1/spot_direct_exchange_rate/btc/usd/recent': [
          { price: '2', volume: '3', timestamp: 123 }
        ],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/btc/recent': [
          { price: '10', volume: '5', timestamp: 123  }
        ],
      });
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.fetchRate('eth', 'btc', 'usd', '1m');
      expect(result).to.deep.equal({
        price: new Big('20'),
        volume: new Big('5.0'),
      });
    });

    it('reports 0 volume if proxy volume is 0', async () => {
      const client = new MockMarketDataClient(undefined, {
        'v1/data/trades.v1/spot_direct_exchange_rate/btc/usd/recent': [
          { price: '2', volume: '3', timestamp: 123 }
        ],
        'v1/data/trades.v1/spot_direct_exchange_rate/eth/btc/recent': [
          { price: '10', volume: '0', timestamp: 123  }
        ],
      });
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.fetchRate('eth', 'btc', 'usd', '1m');
      expect(result).to.deep.equal({
        price: new Big('20'),
        volume: new Big('0.0'),
      });
    });
  });

  describe('fetchProxyAssets', () => {
    it('includes quote asset if direct spot pair exists', async () => {
      const client = new MockMarketDataClient([{
        class: 'spot',
        base_asset: 'btc',
        quote_asset: 'usd'
      }], undefined);
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.fetchProxyAssets('btc', 'usd');
      expect(result).to.deep.equal(['usd']);
    });

    it('does not include quote asset if no direct spot pair exists', async () => {
      const client = new MockMarketDataClient([
        {
          class: 'spot',
          base_asset: 'btc',
          quote_asset: 'eur'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'usd'
        },
      ], undefined);
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.fetchProxyAssets('btc', 'usd');
      expect(result).to.have.members([]);
    });

    it('single path with two pairs', async () => {
      const client = new MockMarketDataClient([
        {
          class: 'spot',
          base_asset: 'btc',
          quote_asset: 'usd'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'btc'
        },
      ], undefined);
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.fetchProxyAssets('eth', 'usd');
      expect(result).to.have.members(['btc']);
    });

    it('two paths with different proxy assets', async () => {
      const client = new MockMarketDataClient([
        {
          class: 'spot',
          base_asset: 'dai',
          quote_asset: 'eth'
        },
        {
          class: 'spot',
          base_asset: 'dai',
          quote_asset: 'btc'
        },
        {
          class: 'spot',
          base_asset: 'btc',
          quote_asset: 'usd'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'usd'
        },
      ], undefined);
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.fetchProxyAssets('dai', 'usd');
      expect(result).to.have.members(['eth', 'btc']);
    });

    it('path with two pairs + direct', async () => {
      const client = new MockMarketDataClient([
        {
          class: 'spot',
          base_asset: 'btc',
          quote_asset: 'usd'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'btc'
        },
        {
          class: 'spot',
          base_asset: 'eth',
          quote_asset: 'usd'
        },
      ], undefined);
      const subject = new VWAPDirectExchangeRateClient(client);
      const result = await subject.fetchProxyAssets('eth', 'usd');
      expect(result).to.have.members(['btc', 'usd']);
    });
  });

  describe('calculateVWAP', () => {
    it('correctly aggregates four items', () => {
      const entries = [
        {
          price: new Big('3.2'),
          volume: new Big('526.58')
        },
        {
          price: new Big('10.2'),
          volume: new Big('523.58')
        },
        {
          price: new Big('0.2'),
          volume: new Big('528.98')
        },
        {
          price: new Big('1.4'),
          volume: new Big('524.455')
        },
      ];
      const { price, volume } = VWAPDirectExchangeRateClient.calculateVWAP(entries);
      expect(price).to.deep.equal(new Big('3.73912516430206384784'));
      expect(volume).to.deep.equal(new Big('2103.595'));
    });

    it('discards 0 volume item', () => {
      const entries = [
        {
          price: new Big('3.2'),
          volume: new Big('526.58')
        },
        {
          price: new Big('10.2'),
          volume: new Big('523.58')
        },
        {
          price: new Big('0.2'),
          volume: new Big('528.98')
        },
        {
          price: new Big('1.4'),
          volume: new Big('524.455')
        },
        {
          price: new Big('100.4'),
          volume: new Big('0')
        },
      ];
      const { price, volume } = VWAPDirectExchangeRateClient.calculateVWAP(entries);
      expect(price).to.deep.equal(new Big('3.73912516430206384784'));
      expect(volume).to.deep.equal(new Big('2103.595'));
    });
  });
});
