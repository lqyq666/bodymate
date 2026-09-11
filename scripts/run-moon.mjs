import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const moon = process.env.MOON ?? `${process.env.USERPROFILE ?? ''}\\.moon\\bin\\moon.exe`;
if (!existsSync(moon)) throw new Error(`MoonBit compiler not found: ${moon}`);
const result = spawnSync(moon, process.argv.slice(2), { stdio: 'inherit' });
process.exit(result.status ?? 1);
