function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function normalizeBases(baseFromEnv, baseFromQuery) {
  const base = (baseFromQuery || baseFromEnv || "").replace(/\/+$/, "");
  const noApi = base.replace(/\/api$/i, "");
  const withApi = base.endsWith("/api") ? base : base + "/api";
  return uniq([withApi, noApi]);
}

export default async function handler(req, res) {
  // ENV + override opcional via query (?base=https://seuhost/api)
  const baseEnv = process.env.VF_BASE;            // ex: https://mercatto.varejofacil.com/api
  const baseQ   = (req.query.base || "").toString();
  const bases   = normalizeBases(baseEnv, baseQ);

  const user = process.env.VF_USER;
  const pass = process.env.VF_PASS;

  // caminhos candidatos para "myself"
  const myselfCandidates = uniq([
    "/v1/myself",
    "/myself",
    "/v1/me",
    "/me",
    "/auth/me",
    "/users/me",
    "/v1/users/me",
    "/v1/usuarios/me",
    "/usuario/me",
  ]);

  const results = [];

  try {
    for (const base of bases) {
      // 1) LOGIN nessa base
      const authUrl = `${base}/auth`;
      const authResp = await fetch(authUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });

      const setCookie = authResp.headers.get("set-cookie") || "";
      const authText = await authResp.text();
      let authJson; try { authJson = JSON.parse(authText); } catch {}
      const token =
        authJson?.accessToken || authJson?.token || authJson?.access_token;

      results.push({
        base,
        step: "auth",
        status: authResp.status,
        ok: authResp.ok,
        gotToken: Boolean(token),
        gotCookie: Boolean(setCookie),
        sample: authText.slice(0, 200),
      });

      if (!authResp.ok || !token) {
        // não conseguiu logar nessa base — tenta a próxima base
        continue;
      }

      // 2) testa cada path candidato
      for (const path of myselfCandidates) {
        const url = base.replace(/\/+$/, "") + path;

        const headers = {
          Accept: "application/json",
          Authorization: token,      // << token PURO (sem "Bearer ")
        };
        if (setCookie) headers.cookie = setCookie;

        const r = await fetch(url, { headers });
        const body = await r.text();

        results.push({
          base,
          path,
          status: r.status,
          ok: r.ok,
          used: { tokenRaw: true, cookie: Boolean(setCookie) },
          bodySample: body.slice(0, 250),
        });

        // achou o caminho correto — já podemos parar
        if (r.ok) {
          return res.status(200).json({
            found: { base, path },
            hint: "Use esse base+path para as próximas chamadas (e o header Authorization com o token puro).",
            results,
          });
        }
      }
    }

    // nada bateu 200
    return res.status(200).json({
      found: null,
      hint: "Nenhum path retornou 200. Confira se a base correta tem /api no final, e mande mais paths para testarmos.",
      results,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e), results });
  }
}
