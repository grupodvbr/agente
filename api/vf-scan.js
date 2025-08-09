// /api/vf-scan.js
function uniq(a) { return [...new Set(a.filter(Boolean))]; }

function normalizeBases(baseFromEnv, baseFromQuery) {
  const base = (baseFromQuery || baseFromEnv || "").trim().replace(/\/+$/, "");
  const withApi = base.endsWith("/api") ? base : base + "/api";
  const noApi   = base.replace(/\/api$/i, "");
  return uniq([withApi, noApi]);
}

function asJsonMaybe(text) {
  try { return JSON.parse(text); } catch { return null; }
}

export default async function handler(req, res) {
  const baseEnv = process.env.VF_BASE;          // ex: https://mercatto.varejofacil.com/api
  const baseQ   = (req.query.base || "").toString();
  const bases   = normalizeBases(baseEnv, baseQ);

  const user = process.env.VF_USER;
  const pass = process.env.VF_PASS;

  // datas padrão (pode sobrescrever via query)
  const de  = (req.query.de  || "2025-08-01").toString();
  const ate = (req.query.ate || "2025-08-08").toString();

  // candidatos de "quem sou eu"
  const identityCandidates = uniq([
    "/v1/myself", "/myself", "/v1/me", "/me",
    "/auth/me", "/usuarios/me", "/users/me", "/v1/usuarios/me", "/v1/users/me"
  ]);

  // candidatos de vendas
  const vendasCandidates = uniq([
    // API "clássica"
    "/v1/vendas", "/vendas", "/integracao/v1/vendas", "/api/v1/vendas",
    // páginas/rotas que já vimos existirem no site
    "/resumoDeVendas/", "/api/resumoDeVendas/"
  ]);

  const results = [];
  const hits = [];

  const pushResult = (obj) => {
    // limita o tamanho das amostras pra não estourar resposta
    const r = { ...obj };
    if (typeof r.bodySample === "string")  r.bodySample  = r.bodySample.slice(0, 500);
    if (typeof r.sample === "string")      r.sample      = r.sample.slice(0, 500);
    results.push(r);
  };

  try {
    for (const base of bases) {
      // 1) AUTH
      const loginResp = await fetch(`${base}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });

      const cookie = loginResp.headers.get("set-cookie") || "";
      const loginTxt = await loginResp.text();
      const loginJson = asJsonMaybe(loginTxt);
      const token = loginJson?.accessToken || loginJson?.token || loginJson?.access_token;

      pushResult({
        base, step: "auth", status: loginResp.status, ok: loginResp.ok,
        gotToken: Boolean(token), gotCookie: Boolean(cookie),
        sample: loginTxt,
      });

      if (!loginResp.ok || !token) continue;

      // helper para chamar um endpoint
      const call = async (path) => {
        const url = new URL(base.replace(/\/+$/, "") + path);
        // adiciona query params conforme o tipo
        if (path.toLowerCase().includes("resumodevendas")) {
          url.searchParams.set("de", de);
          url.searchParams.set("ate", ate);
        } else if (path.toLowerCase().includes("venda")) {
          url.searchParams.set("dataInicial", de);
          url.searchParams.set("dataFinal", ate);
        }
        const headers = { Accept: "application/json", Authorization: token };
        if (cookie) headers.cookie = cookie;

        const r = await fetch(url.toString(), { headers });
        const text = await r.text();

        pushResult({
          base, path, url: url.toString(),
          status: r.status, ok: r.ok,
          used: { tokenRaw: true, cookie: Boolean(cookie) },
          bodySample: text,
        });

        if (r.ok) {
          hits.push({ base, path, url: url.toString(), kind: path.includes("venda") ? "vendas" : "identity" });
        }
      };

      // 2) testa identidade
      for (const p of identityCandidates) await call(p);
      // 3) testa vendas
      for (const p of vendasCandidates)  await call(p);

      if (hits.length) break; // já achou pelo menos um, não precisa continuar outras bases
    }

    const found = hits[0] || null;
    return res.status(200).json({
      found,
      hits,
      hint: found
        ? "Use Authorization=<token> (sem 'Bearer'). Se for vendas, respeite os nomes de parâmetros listados."
        : "Nenhum path retornou 200. Confirme a base (tente com/sem /api) ou me diga mais rotas pra eu incluir.",
      results,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err), results, hits });
  }
}
