export default async function handler(req, res) {
  const base = process.env.VF_BASE;        // https://villachopp.varejofacil.com
  const token = process.env.VF_TOKEN;      // sua chave

  const { de = "2025-08-01", ate = "2025-08-08" } = req.query;

  const paths = [
    `/api/v1/vendas?dataInicial=${de}&dataFinal=${ate}`,
    `/v1/vendas?dataInicial=${de}&dataFinal=${ate}`,
    `/integracao/v1/vendas?dataInicial=${de}&dataFinal=${ate}`,
    `/resumoDeVendas/?de=${de}&ate=${ate}`,              // rota que vimos no DevTools
    `/api/resumoDeVendas/?de=${de}&ate=${ate}`
  ];

  const headerSets = [
    { name: "Authorization: Bearer", headers: (t)=>({ Authorization:`Bearer ${t}`, Accept:"application/json"}) },
    { name: "Authorization: Token",  headers: (t)=>({ Authorization:`Token ${t}`,  Accept:"application/json"}) },
    { name: "Authorization: raw",    headers: (t)=>({ Authorization:`${t}`,        Accept:"application/json"}) },
    { name: "X-API-Key",             headers: (t)=>({ "X-API-Key": t,              Accept:"application/json"}) },
    { name: "X-Auth-Token",          headers: (t)=>({ "X-Auth-Token": t,           Accept:"application/json"}) },
    { name: "Chave-Integracao",      headers: (t)=>({ "Chave-Integracao": t,       Accept:"application/json"}) },
  ];

  const results = [];
  for (const p of paths) {
    for (const hs of headerSets) {
      const url = `${base}${p}`;
      try {
        const r = await fetch(url, { headers: hs.headers(token) });
        const text = await r.text();
        results.push({ url, auth: hs.name, status: r.status, ok: r.ok, bodySample: text.slice(0, 200) });
      } catch (e) {
        results.push({ url, auth: hs.name, error: String(e) });
      }
    }
    // também tenta com token via querystring (algumas instalações usam assim)
    try {
      const url = `${base}${p}&token=${encodeURIComponent(token)}`;
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await r.text();
      results.push({ url, auth: "query ?token=", status: r.status, ok: r.ok, bodySample: text.slice(0, 200) });
    } catch (e) {
      results.push({ url: `${base}${p}&token=***`, auth: "query ?token=", error: String(e) });
    }
  }

  return res.status(200).json({ base, de, ate, results });
}
