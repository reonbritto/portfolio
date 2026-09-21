/**
 * reondev.top — Worker in front of the static site.
 *
 * Static files are served by Workers Assets (wrangler.jsonc: assets.directory).
 * Because an asset match is served before this script runs, the only requests
 * that reach here are ones no file answers — which is exactly the API.
 *
 *   GET /api/hello   Your own request, reflected back: what Cloudflare's edge
 *                    saw of your TLS handshake, network and location, plus the
 *                    headers your browser sent. Nothing is stored or logged.
 *
 * Anything else falls through to the assets binding (and its 404).
 */

const ALLOWED_ORIGIN = "https://reondev.top";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/hello") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ error: "method_not_allowed" }, 405, { Allow: "GET, HEAD" });
      }
      return json(reflect(request), 200);
    }

    return env.ASSETS.fetch(request);
  },
};

function reflect(request) {
  const cf = request.cf || {};
  const h = request.headers;
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const str = (v) => (typeof v === "string" && v.length ? v : null);
  const approx = (v) => (v == null ? null : Math.round(parseFloat(v) * 10) / 10); // 1 dp ≈ city level

  return {
    ok: true,
    note: "Your own request, reflected back. Nothing here is stored or logged.",
    at: new Date().toISOString(),
    ray: str(h.get("cf-ray")),
    ip: str(h.get("cf-connecting-ip")),
    edge: {
      colo: str(cf.colo),
      httpProtocol: str(cf.httpProtocol),
      tlsVersion: str(cf.tlsVersion),
      tlsCipher: str(cf.tlsCipher),
      tlsClientHelloLength: str(cf.tlsClientHelloLength),
      tlsClientCiphersSha1: str(cf.tlsClientCiphersSha1),
      tlsClientExtensionsSha1: str(cf.tlsClientExtensionsSha1),
      clientTcpRtt: num(cf.clientTcpRtt),
      clientQuicRtt: num(cf.clientQuicRtt),
      clientAcceptEncoding: str(cf.clientAcceptEncoding),
      requestPriority: str(cf.requestPriority),
    },
    network: {
      asn: num(cf.asn),
      asOrganization: str(cf.asOrganization),
    },
    geo: {
      continent: str(cf.continent),
      country: str(cf.country),
      isEUCountry: cf.isEUCountry === "1",
      region: str(cf.region),
      regionCode: str(cf.regionCode),
      city: str(cf.city),
      postalCode: str(cf.postalCode),
      timezone: str(cf.timezone),
      latitude: approx(cf.latitude),
      longitude: approx(cf.longitude),
    },
    headers: {
      userAgent: str(h.get("user-agent")),
      accept: str(h.get("accept")),
      acceptLanguage: str(h.get("accept-language")),
      acceptEncoding: str(h.get("accept-encoding")),
      secChUa: str(h.get("sec-ch-ua")),
      secChUaPlatform: str(h.get("sec-ch-ua-platform")),
      secChUaMobile: str(h.get("sec-ch-ua-mobile")),
      secFetchSite: str(h.get("sec-fetch-site")),
      secFetchMode: str(h.get("sec-fetch-mode")),
      dnt: str(h.get("dnt")),
      secGpc: str(h.get("sec-gpc")),
      referer: str(h.get("referer")),
    },
  };
}

function json(body, status, extra) {
  return new Response(JSON.stringify(body, null, 2) + "\n", {
    status,
    headers: Object.assign(
      {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
      extra || {}
    ),
  });
}
