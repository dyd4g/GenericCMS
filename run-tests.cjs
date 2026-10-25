// Runs every verify-*.cjs suite. Usage: npm test
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
let failed = 0;
for (const file of fs.readdirSync(__dirname).filter(f => /^verify-.*\.cjs$/.test(f)).sort()) {
  const run = spawnSync(process.execPath, [path.join(__dirname, file)], { encoding: 'utf8' });
  if (run.status === 0) console.log('PASS', file);
  else { failed++; console.log('FAIL', file); console.log((run.stdout + run.stderr).split('\n').slice(-8).join('\n')); }
}
console.log(failed ? `${failed} suite(s) failed.` : 'All suites passed.');
process.exit(failed ? 1 : 0);
