/**
 * Build command of the Cloudflare "pos-app" worker (npm run build:web).
 *
 * Builds the web app; when Cloudflare Workers Builds is building the main branch it also
 * publishes it with `wrangler deploy`, so merging to main always updates beecash.app even if
 * the dashboard's production branch or deploy command point somewhere else. Locally (no
 * WORKERS_CI_BRANCH) it only builds.
 */
import { execSync } from 'node:child_process';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

run('npx vite build');

const branch = process.env.WORKERS_CI_BRANCH;
if (branch === 'main') {
  console.log('Workers Builds on main: publishing to production (wrangler deploy)…');
  run('npx wrangler deploy');
} else if (branch) {
  console.log(`Workers Builds on branch "${branch}": build only, the dashboard's deploy command decides what happens next.`);
}
