// Parosa image CDN — Cloudflare Worker for img.parosa.food
//
// https://img.parosa.food/<path> serves
// https://cyyyrunhjwnadjnsrtog.supabase.co/storage/v1/object/public/photos/<path>
// from Cloudflare's edge cache. Supabase is asked once per photo per Cloudflare
// location; every later scan is served by Cloudflare, so Supabase bandwidth
// stays near zero. Photo file names are unique (a new upload gets a new name),
// so cached copies never go stale.
//
// Only GET/HEAD of the public "photos" bucket is allowed — this is not an
// open proxy.

const ORIGIN = "https://cyyyrunhjwnadjnsrtog.supabase.co/storage/v1/object/public/photos/";
const YEAR = 31536000;

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, "");
    if (!path || path.includes("..") || !/^[\w\-./%]+$/.test(path)) {
      return new Response("Not found", { status: 404 });
    }

    // one cache entry per photo, whatever query string a browser adds
    const cacheKey = new Request(`${url.origin}/${path}`, { method: "GET" });
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) {
      const out = new Response(request.method === "HEAD" ? null : hit.body, hit);
      out.headers.set("X-Parosa-CDN", "hit");
      return out;
    }

    const upstream = await fetch(ORIGIN + path, { cf: { cacheTtl: YEAR, cacheEverything: true } });
    if (!upstream.ok) {
      // Supabase answers 400 for a file that isn't there. Don't cache misses
      // for long — the owner may be uploading right now.
      const gone = upstream.status === 400 || upstream.status === 404;
      return new Response(gone ? "Not found" : "Upstream error", {
        status: gone ? 404 : 502,
        headers: { "Cache-Control": "public, max-age=60" },
      });
    }

    const res = new Response(upstream.body, upstream);
    res.headers.set("Cache-Control", `public, max-age=${YEAR}, immutable`);
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.delete("Set-Cookie");
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    const out = new Response(request.method === "HEAD" ? null : res.body, res);
    out.headers.set("X-Parosa-CDN", "miss");
    return out;
  },
};
