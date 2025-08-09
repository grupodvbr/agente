export default async function handler(req, res) {
  const baseUrl = process.env.VF_BASE;      // https://mercatto.varejofacil.com/api/v1
  const token   = process.env.VF_TOKEN;

  try {
    const { de, ate, loja } = req.query;

    // 1) TROCAR AQUI pelo path que aparece no Swagger (ex.: '/vendas')
    const path = '/vendas';

    const url = new URL(baseUrl + path);
    // 2) TROCAR os nomes dos params conforme o Swagger (ex.: dataInicial/dataFinal)
    url.searchParams.set('dataInicial', String(de));
    url.searchParams.set('dataFinal',   String(ate));
    if (loja) url.searchParams.set('lojaId', String(loja)); // se existir

    const r = await fetch(url.toString(), {
      headers: {
        // 3) TROCAR AQUI pelo header do Swagger (ex.: Authorization: Bearer <token> ou X-Agente-Token)
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const raw = await r.text();
    return res.status(r.status).json({ requestedUrl: url.toString(), status: r.status, raw });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
