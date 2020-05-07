const assert = require('chai').assert;
const { validateEndpoint } = require('../dist/index');
let moment = require('moment');

describe('validateEndpoint', () => {
	it('accepts exchange rate requests', () => {
		const result = validateEndpoint('v1/data/trades.v1/spot_direct_exchange_rate/eth/usd/recent');
		assert.isTrue(result);
	});
});
