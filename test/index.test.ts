/*
const assert = require('chai').assert;
const createRequest = require('../index.js').createRequest;
let moment = require('moment');

describe('createRequest', () => {
	context('with a given start time (-2 days)', () => {
		const jobID = '278c97ffadb54a5bbb93cfec5f7b5503';
		const req = {
			id: jobID,
			data: {
				exchange: 'stmp',
				instrument: 'btc-usd',
				start_time: (moment.utc().format('X') - 172800) // Solidity: `now - 2 days`
			}
		};

		it('returns data to the node', (done) => {
			createRequest(req, (statusCode, data) => {
				assert.equal(statusCode, 200);
				assert.equal(data.jobRunID, jobID);
				assert.isNotEmpty(data.data);
				done();
			});
		});
	});

	context('with a given start time (-3 days) and end time (-2 days)', () => {
		const jobID = '278c97ffadb54a5bbb93cfec5f7b5504';
		const req = {
			id: jobID,
			data: {
				exchange: 'stmp',
				instrument: 'btc-usd',
				start_time: (moment.utc().format('X') - 259200), // Solidity: `now - 3 days`
				end_time: (moment.utc().format('X') - 172800) // Solidity: `now - 2 days`
			}
		};

		it('returns data to the node', (done) => {
			createRequest(req, (statusCode, data) => {
				assert.equal(statusCode, 200);
				assert.equal(data.jobRunID, jobID);
				assert.isNotEmpty(data.data);
				done();
			});
		});
	});

	context('without specify start or end times', () => {
		const jobID = '278c97ffadb54a5bbb93cfec5f7b5505';
		const req = {
			id: jobID,
			data: {
				exchange: 'stmp',
				instrument: 'btc-usd'
			}
		};

		it('returns data to the node', (done) => {
			createRequest(req, (statusCode, data) => {
				assert.equal(statusCode, 200);
				assert.equal(data.jobRunID, jobID);
				assert.isNotEmpty(data.data);
				done();
			});
		});
	});
});
*/
