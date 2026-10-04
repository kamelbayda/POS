// Front worker of beecash.app. Static files (the app) are served from ./dist; only the
// licence routes reach this script (see run_worker_first in wrangler.jsonc) and are
// handed to the pos-licensing worker, so the key admin page lives at beecash.app/admin.
export default {
  async fetch(request, env) {
    return env.LICENSING.fetch(request);
  },
};
