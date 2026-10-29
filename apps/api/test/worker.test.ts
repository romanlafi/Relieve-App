import assert from 'node:assert/strict';
import {test} from 'node:test';
import worker from '../src/worker.js';

test('worker strips the /api prefix before forwarding a request', async () => {
    const response = await worker.fetch(new Request('https://relieve.test/api/health'), {} as never);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {status: 'ok'});
});

test('worker forwards requests outside the API prefix unchanged', async () => {
    const response = await worker.fetch(new Request('https://relieve.test/health'), {} as never);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {status: 'ok'});
});
