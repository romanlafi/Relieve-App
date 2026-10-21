import {spawn} from 'node:child_process';
import {mkdtemp, rm, rmdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadEnvFile} from 'node:process';
import {fileURLToPath} from 'node:url';

const root = new URL('../', import.meta.url);
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath is required to build the database package');
for (const workspace of ['@relieve/shared', '@relieve/database']) {
    const build = spawn(process.execPath, [npmCli, 'run', 'build', `--workspace=${workspace}`], {
        cwd: fileURLToPath(root), stdio: 'inherit',
    });
    const buildExitCode = await new Promise((resolve, reject) => {
        build.once('error', reject);
        build.once('exit', (code) => resolve(code ?? 0));
    });
    if (buildExitCode !== 0) process.exit(buildExitCode);
}
try {
    loadEnvFile(fileURLToPath(new URL('.env', root)));
} catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Unable to load local environment', {cause: error});
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for local API development');
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'relieve-api-'));
const envFile = join(temporaryDirectory, '.env');
await writeFile(envFile, `DATABASE_URL=${JSON.stringify(process.env.DATABASE_URL)}\nLOCAL_DEVELOPMENT=true\n`, {mode: 0o600});
const childEnvironment = {...process.env};
delete childEnvironment.DATABASE_URL;
delete childEnvironment.DATABASE_URL_DIRECT;
try {
    const child = spawn(process.execPath, [
        fileURLToPath(new URL('node_modules/wrangler/bin/wrangler.js', root)),
        'dev', '--local', '--env-file', envFile, ...process.argv.slice(2),
    ], {cwd: fileURLToPath(new URL('apps/api/', root)), env: childEnvironment, stdio: 'inherit'});
    process.on('SIGINT', () => child.kill('SIGINT'));
    process.on('SIGTERM', () => child.kill('SIGTERM'));
    const exitCode = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', (code) => resolve(code ?? 0));
    });
    process.exitCode = exitCode;
} finally {
    await rm(envFile, {force: true});
    await rmdir(temporaryDirectory);
}
