import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {unstable_readConfig} from 'wrangler';

const root = fileURLToPath(new URL('../', import.meta.url));

test('production publishes public accounts on its domain and preserves branch preview URLs', () => {
    const config = unstable_readConfig({config: resolve(root, 'wrangler.production.jsonc')});
    assert.equal(config.name, 'relieve-app');
    assert.equal(config.workers_dev, false);
    assert.equal(config.preview_urls, true);
    assert.deepEqual(config.routes, [{pattern: 'relieve.romanlafi.org', custom_domain: true}]);
    assert.match(config.vars.NEON_AUTH_URL, /^https:\/\/ep-[\w-]+\.neonauth\./);
    assert.notEqual(config.vars.PUBLIC_READ_ONLY, 'true');
    assert.notEqual(config.vars.LOCAL_DEVELOPMENT, 'true');
});

test('Workers Builds discovers the complete preview configuration from the repository root', () => {
    process.chdir(root);
    // Match the dashboard's `npx wrangler preview`, without an explicit --config.
    const config = unstable_readConfig({}, {isPreview: true});
    assert.equal(config.configPath, resolve(root, 'wrangler.jsonc'));
    assert.equal(config.name, 'relieve-app');
    assert.equal(config.main, resolve(root, 'apps/api/src/worker.ts'));
    assert.equal(resolve(root, config.assets.directory), resolve(root, 'apps/web/dist'));
    assert.equal(config.assets.not_found_handling, 'single-page-application');
    assert.deepEqual(config.assets.run_worker_first, ['/api/*']);
    assert.equal(config.preview_urls, true);
    assert.notEqual(config.vars.LOCAL_DEVELOPMENT, 'true');
});
