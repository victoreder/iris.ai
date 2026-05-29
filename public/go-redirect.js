(function () {
  var match = /^\/l\/([^/?#]+)/i.exec(location.pathname);
  if (!match) return;

  var slug = decodeURIComponent(match[1]);
  var apiBase = (document.querySelector('meta[name="go-backend"]') || {}).content || "";
  apiBase = apiBase.replace(/\/+$/, "");
  if (!apiBase) return;

  if (window.__goRedirectStarted) return;
  window.__goRedirectStarted = true;

  function getCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  var params = new URLSearchParams(location.search);
  var payload = {
    slug: slug,
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term"),
    fbclid: params.get("fbclid"),
    gclid: params.get("gclid"),
    ttclid: params.get("ttclid"),
    referrer: document.referrer || null,
    landingUrl: location.href,
    userAgent: navigator.userAgent,
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
  };

  window.__goRedirectPromise = fetch(apiBase + "/api/leads/registrar-clique", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  })
    .then(function (res) {
      return res.json().then(function (data) {
        if (res.ok && data.waUrl) {
          location.replace(data.waUrl);
          return { ok: true };
        }
        return { ok: false, error: (data && data.error) || "Erro ao registrar clique." };
      });
    })
    .catch(function () {
      return { ok: false, error: "Erro de conexão." };
    });
})();
