// Serves the static archive page. The only logic: every host other than the
// apex (www, the *.chikoja.ir wildcard) gets one permanent redirect, so there
// is a single canonical URL and no duplicate copies of the page.
const CANONICAL_HOST = "chikoja.ir";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // wrangler dev rewrites URLs to localhost; serve the page there too.
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.hostname !== CANONICAL_HOST && !isLocal) {
      return Response.redirect(`https://${CANONICAL_HOST}${url.pathname}${url.search}`, 301);
    }
    return env.ASSETS.fetch(request);
  },
};
