import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  ['node_modules/vitest/vitest.mjs', 'run', 'src/lib/i18n/locale-contract.test.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, REQUIRE_EU: '1' }
  }
);
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
