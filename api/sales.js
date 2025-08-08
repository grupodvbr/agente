export default async function handler(req, res) {
  const baseUrl = process.env.VF_BASE;
  const token   = process.env.VF_TOKEN;

  try {
    const { de, ate } = req.query;
    const url = `${baseUrl}/api/v1/vendas?dataInicial=${de}&dataFinal=${ate}`;

    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });

    const raw = await r.text();
    return res.status(r.status).json({
      requestedUrl: url,
      status: r.status,
      raw
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}
