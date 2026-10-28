import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {unstable_readConfig} from 'wrangler';

const root = fileURLToPath(new URL('../', import.meta.url));

test('default CI deployment and the production script use the same config and preserve runtime secrets', () => {
    process.chdir(root);
    const config = unstable_readConfig({});
    const apiPackage = JSON.parse(readFileSync(resolve(root, 'apps/api/package.json'), 'utf8'));
    const scriptConfig = apiPackage.scripts['deploy:production'].match(/--config\s+(\S+)/)?.[1];
    assert.ok(scriptConfig);
    assert.equal(config.configPath, resolve(root, 'apps/api', scriptConfig));
    assert.equal(config.name, 'relieve-app');
    assert.equal(config.workers_dev, false);
    assert.equal(config.preview_urls, true);
    assert.deepEqual(config.routes, [{pattern: 'relieve.romanlafi.org', custom_domain: true}]);
    // A plaintext declaration would replace the persistent runtime secret and
    // make a later deployment from another entry point remove authentication.
    assert.equal(config.vars.NEON_AUTH_URL, undefined);
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
