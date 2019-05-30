const request = require('request');
const moment = require('moment');
const lodash = require('lodash');

const URI_PARTS = [
  'domain',
  'apiVersion',
  'prefix',
  'commodity',
  'resource',
  'params'
];

// valid variations:
// https://<eu|us>.market-api.kaiko.io/v1/data/trades.v1/exchanges/cbse/spot/btc-usd/aggregations/ohlcv/recent
// https://<eu|us>.market-api.kaiko.io/v1/data/trades.v1/exchanges/cbse/spot/btc-usd/aggregations/vwap/recent'
// https://<eu|us>.market-api.kaiko.io/v1/data/trades.v1/exchanges/cbse/spot/btc-usd/aggregations/count_ohlcv_vwap/recent
// https://<eu|us>.market-api.kaiko.io/v1/data/trades.v1/spot_direct_exchange_rate/link/usdt/recent?interval=1m&limit=2

const VALIDATORS = {
  region: v => ['eu', 'us'].includes(v),
  endpoint: v => !!v.match(/^v1\/data\/trades\.v[0-9]+\/(exchanges\/[^?\/]+\/[^?\/]+\/[^?\/]+\/aggregations\/[^?\/]+|spot_direct_exchange_rate\/[^?\/]+\/[^?\/]+)\/recent$/),
  params: v => !!v.match(/^[\x00-\x7F]*$/)
};


const createRequest = (input, callback) => {
  const throwError = (statusCode, error) => callback(statusCode, {
    jobRunID: input.id,
    status: 'errored',
    error 
  });

  for (let key in VALIDATORS) {
    const validator = VALIDATORS[key];
    const value = input.data[key];
    if (!value || !validator(value)) {
      return throwError(400, `Invalid argument ${key}`);
    }
  }

  const { region, endpoint, params } = input.data;
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

exports.gcpservice = (req, res) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data);
  });
};

exports.handler = (event, context, callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data);
  });
}

module.exports.createRequest = createRequest;