export default async function handler(req, res) {
  try {
    const { de, ate } = req.query;

    const base = process.env.F360_BASE;      // ex.: https://api.f360.com.br/public
    const token = process.env.F360_TOKEN;    // seu token da API pública F360

    if (!base || !token) {
      return res.status(500).json({ error: "F360_BASE ou F360_TOKEN não configurados no Vercel." });
    }
    if (!de || !ate) {
      return res.status(400).json({ error: "Informe ?de=YYYY-MM-DD&ate=YYYY-MM-DD" });
    }

    // 🔁 Ajuste ESTA URL para a rota real de vendas do F360:
    const url = `${base}/v1/vendas?dataInicial=${de}&dataFinal=${ate}`; // <- troque conforme a doc

    const resp = await fetch(url, {
      headers: {
        // Se o F360 usa Bearer:
        Authorization: `Bearer ${token}`,
        Accept: "application/json",

        // Se a doc disser X-API-Key, troque pelo abaixo e remova o Authorization:
        // "X-API-Key": token,
      },
      // Se precisar método/params específicos, ajuste aqui (GET/POST etc.)
    });

    const raw = await resp.text();
    let json;
    try { json = JSON.parse(raw); } catch { json = raw; }

    return res.status(resp.status).json({
      requestedUrl: url,
      status: resp.status,
      data: json
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
