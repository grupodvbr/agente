const VF_BASE  = process.env.VF_BASE;
const VF_TOKEN = process.env.VF_TOKEN;

export default async function handler(req, res) {
  try {
    const { de, ate } = req.query;

    // Ajuste o endpoint conforme o real do Varejo Fácil
    const url = `${VF_BASE}/api/v1/vendas?dataInicial=${de}&dataFinal=${ate}`;

    const r = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${VF_TOKEN}`,
        "Accept": "application/json"
      }
    });

    const text = await r.text();

    // Retorno de debug para conferirmos
    if (!r.ok) {
      return res.status(r.status).json({
        requestedUrl: url,
        status: r.status,
        raw: text
      });
    }

    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    res.status(200).json({
      requestedUrl: url,
      data
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
