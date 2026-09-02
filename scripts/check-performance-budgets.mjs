import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const budgets = JSON.parse(readFileSync(join(root, 'performance-budgets.json'), 'utf8'));
const failures = [];

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

for (const [directoryName, budget] of Object.entries(budgets)) {
  const directory = join(root, directoryName);
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) {
    failures.push(`${directoryName}: build output отсутствует`);
    continue;
  }
  const assets = files(directory);
  const javascript = assets.filter((file) => extname(file) === '.js');
  const css = assets.filter((file) => extname(file) === '.css');
  const jsSizes = javascript.map((file) => ({
    file,
    bytes: gzipSync(readFileSync(file)).byteLength,
  }));
  const cssSizes = css.map((file) => ({ file, bytes: statSync(file).size }));
  const totalJs = jsSizes.reduce((sum, asset) => sum + asset.bytes, 0);
  const largestJs = jsSizes.sort((left, right) => right.bytes - left.bytes)[0];
  const largestCss = cssSizes.sort((left, right) => right.bytes - left.bytes)[0];

  if (largestJs && largestJs.bytes > budget.maxSingleGzipJsBytes) {
    failures.push(
      `${relative(root, largestJs.file)}: gzip JS ${largestJs.bytes} > ${budget.maxSingleGzipJsBytes}`,
    );
  }
  if (totalJs > budget.maxTotalGzipJsBytes) {
    failures.push(`${directoryName}: total gzip JS ${totalJs} > ${budget.maxTotalGzipJsBytes}`);
  }
  if (largestCss && largestCss.bytes > budget.maxSingleCssBytes) {
    failures.push(
      `${relative(root, largestCss.file)}: CSS ${largestCss.bytes} > ${budget.maxSingleCssBytes}`,
    );
  }
  process.stdout.write(
    `${directoryName}: ${javascript.length} JS, total gzip ${totalJs} B, max JS ${largestJs?.bytes ?? 0} B, max CSS ${largestCss?.bytes ?? 0} B\n`,
  );
}

if (failures.length) {
  process.stderr.write(`Performance budget failed:\n- ${failures.join('\n- ')}\n`);
  process.exitCode = 1;
}
