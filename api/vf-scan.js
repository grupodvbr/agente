function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }
function normalizeBases(baseFromEnv, baseFromQuery) {
  const base = (baseFromQuery || baseFromEnv || "").replace(/\/+$/, "");
  const noApi = base.replace(/\/api$/i, "");
  const withApi = base.endsWith("/api") ? base : base + "/api";
  return uniq([withApi, noApi]);
}

export default async function handler(req, res) {
  const baseEnv = process.env.VF_BASE;           // ex: https://mercatto.varejofacil.com/api
  const baseQ   = (req.query.base || "").toString();
  const bases   = normalizeBases(baseEnv, baseQ);

  const user = process.env.VF_USER;
  const pass = process.env.VF_PASS;

  const de  = req.query.de  || "2025-08-01";
  const ate = req.query.ate || "2025-08-08";

  // candidatos para vendas
  const vendasCandidates = uniq([
    // APIs prováveis
    "/v1/vendas",
    "/vendas",
    "/integracao/v1/vendas",
    "/api/v1/vendas",        // caso a base venha sem /api
    // rotas "legadas" que vimos no site
    "/resumoDeVendas/",
    "/api/resumoDeVendas/",
  ]);

  const results = [];

  try {
    for (const base of bases) {
      // 1) login
      const login = await fetch(`${base}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: user, password: pass })
      });

      const setCookie = login.headers.get("set-cookie") || "";
      const loginTxt  = await login.text();
      let j; try { j = JSON.parse(loginTxt); } catch {}
      const token = j?.accessToken || j?.token || j?.access_token;

      results.push({
        base, step: "auth", status: login.status, ok: login.ok,
        gotToken: Boolean(token), gotCookie: Boolean(setCookie),
        sample: loginTxt.slice(0, 200)
      });

      if (!login.ok || !token) continue;

      // 2) testa vendas
      for (const path of vendasCandidates) {
        const url = new URL(base.replace(/\/+$/, "") + path);
        // quando a rota tem query padrão:
        if (path.includes("resumoDeVendas")) {
          url.searchParams.set("de",  de);
          url.searchParams.set("ate", ate);
        } else {
          url.searchParams.set("dataInicial", de);
          url.searchParams.set("dataFinal",   ate);
        }

        const headers = { Accept: "application/json", Authorization: token };
        if (setCookie) headers.cookie = setCookie;

        const r    = await fetch(url.toString(), { headers });
        const body = await r.text();

        results.push({
          base, path, url: url.toString(),
          status: r.status, ok: r.ok,
          used: { tokenRaw: true, cookie: Boolean(setCookie) },
          bodySample: body.slice(0, 400)
        });

        if (r.ok) {
          return res.status(200).json({
            found: { base, path, url: url.toString() },
            hint: "Use Authorization = <token> (sem 'Bearer') e estes parâmetros de datas.",
            results
          });
        }
      }
    }

    return res.status(200).json({
      found: null,
      hint: "Nenhum path de vendas retornou 200. Se tiver mais caminhos, me manda que eu adiciono aqui rapidinho.",
      results
    });
  } catch (e) {
    return res.status(500).json({ error: String(e), results });
  }
}
