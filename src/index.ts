import request = require('request');
import { RequestPart } from 'request';
import { URLSearchParams } from 'url';

// valid variations:
// https://<eu|us>.market-api.kaiko.io/v1/data/trades.v1/exchanges/cbse/spot/btc-usd/aggregations/ohlcv/recent
// https://<eu|us>.market-api.kaiko.io/v1/data/trades.v1/exchanges/cbse/spot/btc-usd/aggregations/vwap/recent'
// https://<eu|us>.market-api.kaiko.io/v1/data/trades.v1/exchanges/cbse/spot/btc-usd/aggregations/count_ohlcv_vwap/recent
// https://<eu|us>.market-api.kaiko.io/v1/data/trades.v1/spot_direct_exchange_rate/link/usdt/recent?interval=1m&limit=2

type Validator = (v: string) => boolean;

interface InputData {
  region: string;
  endpoint: string;
  params?: string;
}

interface InputParams {
  id: string;
  data: InputData;
}

interface ChainlinkResult {
  jobRunID: string;
  status?: string;
  error?: string;
  data?: any;
}

type Callback = (statusCode: number, result: ChainlinkResult) => void;

const validateRegion: Validator = v =>
    v && ['eu', 'us'].includes(v);
const validateEndpoint: Validator = v =>
    v && !!v.match(/^v1\/data\/trades\.v[0-9]+\/(exchanges\/[^?\/]+\/[^?\/]+\/[^?\/]+\/aggregations\/[^?\/]+|spot_direct_exchange_rate\/[^?\/]+\/[^?\/]+)\/recent$/);
const validateParams: Validator = v =>
    v && !!v.match(/^[\x00-\x7F]*$/);

const createRequest = (input: InputParams, callback: Callback) => {
  const throwError = (statusCode: number, error: string) => callback(statusCode, {
    jobRunID: input.id,
    status: 'errored',
    error
  });

  const { region, endpoint, params } = input.data;
  if (!validateRegion(region)) {
    return throwError(400, 'Invalid region');
  }
  if (!validateEndpoint(region)) {
    return throwError(400, 'Invalid endpoint');
  }
  if (!validateParams(region)) {
    return throwError(400, 'Invalid params');
  }

  if (Object.keys(input.data).length !== 3) {
    return throwError(400, `Invalid argument length ${input.data}, expected 3`);
  }

  const url = `https://${region}.market-api.kaiko.io/${endpoint}?${params}`;
  const headers = {
    'X-Api-Key': process.env.API_KEY,
    'User-Agent': 'Kaiko Chainlink Adapter'
  };
  const qs = new URLSearchParams(params);
  const options = {
    url,
    qs,
    headers,
    json: true
  };

  request(options, (error, response, body) => {
    if (error || response.statusCode >= 400) {
      callback(response.statusCode, {
        jobRunID: input.id,
        status: 'errored',
        error: body
      });
    } else {
      callback(response.statusCode, {
        jobRunID: input.id,
        data: body
      });
    }
  });
};

exports.gcpservice = (req: RequestPart, res: any) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data);
  });
};

exports.handler = (event: any, context: any, callback: Callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data);
  });
};

module.exports.createRequest = createRequest;
