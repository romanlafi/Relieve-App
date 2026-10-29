import {readFile} from 'node:fs/promises';
import coverageLib from 'istanbul-lib-coverage';
import reportLib from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const {createCoverageMap} = coverageLib;
const {createContext} = reportLib;

const coverageMap = createCoverageMap({});
for (const reportPath of ['coverage/node/coverage-final.json', 'coverage/vitest/coverage-final.json']) {
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    coverageMap.merge(report);
}

const context = createContext({dir: 'coverage', coverageMap});
reports.create('text').execute(context);
reports.create('text-summary').execute(context);
reports.create('json').execute(context);
reports.create('lcovonly').execute(context);
