import Big, { RoundingMode } from 'big.js';
import ClientError from './ClientError';
import { ChainlinkResult, InputParams } from './index.d';
import { IPriceClient } from './IPriceClient';
import logger from './logger';
import MarketDataClient from './MarketDataClient';
import SpotDirectExchangeRateClient from './SpotDirectExchangeRateClient';
import SpotExchangeRateClient from './SpotExchangeRateClient';
import VWAPDirectExchangeRateClient from './VWAPDirectExchangeRateClient';

const run = async (input: InputParams): Promise<Big> => {
  logger.info('Received request', input);

  let base = input.data.base || input.data.from || input.data.coin;
  let quote = input.data.quote || input.data.to || input.data.market;

  if (!base || !base.match(/^[a-zA-Z0-9]+$/)) {
    throw new ClientError(400, `Invalid or missing base asset ${base}`);
  }

  if (!quote || !quote.match(/^[a-zA-Z0-9]+$/)) {
    throw new ClientError(400, `Invalid or missing quote asset ${quote}`);
  }

  const doInverse =  input.data.do_inverse || base === 'usdt' && quote === 'eth'; // Existing job compatability
  if (doInverse) {
    base = quote.toLowerCase();
    quote = base.toLowerCase();
  } else {
    base = base.toLowerCase();
    quote = quote.toLowerCase();
  }

  const client = new MarketDataClient();

  const agent: IPriceClient = ((method: string) => {
    switch (method) {
      case 'spot_exchange_rate':
        return new SpotExchangeRateClient(client);
      case 'vwap':
        return new VWAPDirectExchangeRateClient(client, parseInt(process.env.MAX_QUOTE_ASSETS, 10));
      case 'spot_direct_exchange_rate':
      default:
        return new SpotDirectExchangeRateClient(client);
    }
  })(input.data.method);

  const price = await agent.getPrice(base, quote, '1m');
  const result = doInverse
    ? new Big(1).div(price)
    : price;
  return result;
};

const createResponse = (req: InputParams, price: Big): ChainlinkResult => ({
  jobRunID: req.id,
  status: '200',
  data: {
    result: parseInt(price.round(0, RoundingMode.RoundHalfEven).toString(), 10)
  }
});

// GCP Cloud Fuction handler

export const gcpservice = (req: { body: InputParams }, res: any) => {
  const params = req.body;
  run(params)
  .then(price => {
    if (price) {
      const response = createResponse(params, price);
      return res.status(200).send(response);
    }
  })
  .catch((err: Error) => {
    logger.error(err.message);
    const response = {
      jobRunID: params.id,
      status: 'errored',
      error: err.message
    };
    return err.name === 'ClientError'
      ? res.status((err as ClientError).statusCode).send(response)
      : res.status(500).send(response);
    }
  );
};
