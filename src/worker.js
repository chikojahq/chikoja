// Static assets are served before this runs, so the Worker only sees hosts
// other than the apex and paths that are not a built page: the English
// aliases (/en/<city>/<category>/), and real 404s.
import aliases from "./aliases.json" with { type: "json" };
const CANONICAL_HOST = "chikoja.ir";

export function englishAlias(pathname) {
  const m = /^\/en\/([^/]+)\/?([^/]*)\/?$/.exec(pathname);
  if (!m) return null;
  const city = aliases.cities[m[1]];
  if (!city) return null;
  const cat = m[2] ? aliases.categories[m[2]] : "";
  if (m[2] && !cat) return null;
  return encodeURI(`/${city}/${cat ? cat + "/" : ""}`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // wrangler dev rewrites URLs to localhost; serve the page there too.
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.hostname !== CANONICAL_HOST && !isLocal) {
      return Response.redirect(`https://${CANONICAL_HOST}${url.pathname}${url.search}`, 301);
    }
    const alias = englishAlias(decodeURI(url.pathname));
    if (alias) return Response.redirect(`${url.origin}${alias}`, 301);
    return env.ASSETS.fetch(request);
  },
};
