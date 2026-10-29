import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createDatabase} from '../src/client.js';
import {resolveAccessUser} from '../src/users.js';
import {developmentUserId} from '../src/developmentUser.js';
import {fakeDatabase} from './fakeDatabase.js';

test('createDatabase accepts PostgreSQL URLs and rejects other protocols', () => {
    assert.ok(createDatabase('postgres://user:password@example.test/relieve'));
    assert.ok(createDatabase('postgresql://user:password@example.test/relieve'));
    for (const url of ['', 'https://example.test', 'mysql://example.test/db']) {
        assert.throws(() => createDatabase(url), /DATABASE_URL must be a PostgreSQL connection URL/);
    }
});

test('development user ID is a stable UUID reserved for local use', () => {
    assert.equal(developmentUserId, '00000000-0000-4000-8000-000000000001');
});

test('resolveAccessUser upserts by access subject and returns the user ID', async () => {
    const {database, calls} = fakeDatabase([[{id: 'user-123'}]]);

    assert.equal(await resolveAccessUser(database, 'subject-1', 'Rafa'), 'user-123');
    assert.deepEqual(calls, ['insert']);
});

test('resolveAccessUser rejects an empty upsert result', async () => {
    const {database} = fakeDatabase([[]]);

    await assert.rejects(resolveAccessUser(database, 'subject-1', 'Rafa'), /Unable to resolve authenticated user/);
});
