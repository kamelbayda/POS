/**
 * Build command of the Cloudflare "pos-app" worker (npm run build:web).
 *
 * Builds the web app, then, on Cloudflare Workers Builds:
 *  - main: publishes it with `wrangler deploy`, so merging to main always updates beecash.app
 *    even if the dashboard's production branch or deploy command point somewhere else;
 *  - any other branch: uploads it as a preview version under the alias "preview", served at
 *    https://preview-pos-app.<account>.workers.dev, without touching beecash.app. Changes are
 *    tried there first and merged to main once approved.
 * Locally (no WORKERS_CI_BRANCH) it only builds.
 */
import { execSync } from 'node:child_process';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

// Raise this shell's open-file limit to the machine's maximum first: the Cloudflare build
// machine starts with a low one and vite then fails with EMFILE (too many open files).
run(`sh -c 'ulimit -n "$(ulimit -Hn)" 2>/dev/null; exec npx vite build'`);

const branch = process.env.WORKERS_CI_BRANCH;
if (branch === 'main') {
  console.log('Workers Builds on main: publishing to production (wrangler deploy)…');
  run('npx wrangler deploy');
} else if (branch) {
  console.log(`Workers Builds on branch "${branch}": uploading a preview version (alias "preview"); production is not touched…`);
  try {
    run(`npx wrangler versions upload --preview-alias preview --message ${JSON.stringify(`branch ${branch}`.slice(0, 100))}`);
  } catch {
    // Preview URLs may be turned off for the worker (Settings -> Domains & Routes -> Preview URLs)
    console.log('Preview upload failed: check that Preview URLs are enabled for the pos-app worker.');
    process.exitCode = 1;
  }
}
