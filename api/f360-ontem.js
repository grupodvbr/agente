function ymd(d) {
  return d.toISOString().slice(0,10);
}

export default async function handler(req, res) {
  try {
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);

    const de = ymd(ontem);
    const ate = ymd(ontem);

    const baseUrl = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
    const url = `${baseUrl}/api/f360-vendas?de=${de}&ate=${ate}`;

    const r = await fetch(url);
    const payload = await r.json();

    // 🔁 Ajuste abaixo conforme a estrutura que o F360 retorna para “vendas”
    let total = 0;
    const itens = Array.isArray(payload?.data) ? payload.data : [];
    for (const venda of itens) {
      // Ex.: venda.total, venda.valor, venda.valorLiquido... confirme pelo JSON real
      const v = Number(venda?.total || venda?.valor || 0);
      total += isNaN(v) ? 0 : v;
    }

    return res.status(200).json({
      periodo: { de, ate },
      totalVendido: total,
      bruto: total, // ajuste se tiver campo líquido
      fonte: "F360"
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
