export default async function handler(req, res) {
  const base = process.env.VF_BASE;  // ex: https://mercatto.varejofacil.com/api
  const user = process.env.VF_USER;
  const pass = process.env.VF_PASS;

  // opcional: tente enviar um tenant/empresa se você souber (via query)
  const { tenant, company, loja } = req.query;

  try {
    // 1) LOGIN
    const authResp = await fetch(`${base}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });
    const authText = await authResp.text();
    if (!authResp.ok) return res.status(authResp.status).json({ step:"auth", status:authResp.status, raw:authText });

    let auth; try { auth = JSON.parse(authText); } catch {}
    const tokens = {
      accessToken: auth?.accessToken || auth?.token || auth?.access_token,
      refreshToken: auth?.refreshToken || auth?.refresh_token
    };
    if (!tokens.accessToken) return res.status(500).json({ step:"auth-parse", raw:authText });

    // 2) TESTES DE AUTH EM /v1/myself
    const variants = [
      { name:"Authorization: Bearer", headers:(t)=>({ Authorization:`Bearer ${t}` }) },
      { name:"Authorization: JWT",    headers:(t)=>({ Authorization:`JWT ${t}` }) },
      { name:"Authorization: Token",  headers:(t)=>({ Authorization:`Token ${t}` }) },
      { name:"X-API-Key",             headers:(t)=>({ "X-API-Key": t }) },
      { name:"X-Auth-Token",          headers:(t)=>({ "X-Auth-Token": t }) },
      { name:"Chave-Integracao",      headers:(t)=>({ "Chave-Integracao": t }) },
    ];

    const extra = {};
    if (tenant) extra["X-Tenant"] = tenant;
    if (company) extra["X-Company-Id"] = company;
    if (loja) extra["X-Store-Id"] = loja;

    const results = [];
    for (const v of variants) {
      const headers = { Accept:"application/json", ...v.headers(tokens.accessToken), ...extra };
      const r = await fetch(`${base}/v1/myself`, { headers });
      const txt = await r.text();
      results.push({ auth:v.name, status:r.status, ok:r.ok, body: txt.slice(0,300) });
    }

    return res.status(200).json({ step:"myself-matrix", base, results, hint:"se algum 'ok:true' aparecer, usamos esse header/esquema" });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
