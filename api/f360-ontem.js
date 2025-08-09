function toYMD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function handler(req, res) {
  const hoje = new Date();
  const ontemDate = new Date(hoje);
  ontemDate.setDate(hoje.getDate() - 1);

  const de = toYMD(ontemDate);
  const ate = toYMD(ontemDate);

  const baseUrl = new URL(req.url, `http://${req.headers.host}`);
  baseUrl.pathname = "/api/f360-vendas";
  baseUrl.search = `?de=${de}&ate=${ate}`;

  try {
    const r = await fetch(baseUrl.toString());
    const data = await r.json();

    if (!r.ok) {
      res.status(r.status).json(data);
      return;
    }

    // Aqui você pode somar os valores do payload (quando souber o formato)
    res.status(200).json({
      periodo: { de, ate },
      fonte: "F360",
      totalVendido: 0, // ajuste quando souber onde está o total
      bruto: 0,        // idem
      payload: data.payload, // retornamos também o payload bruto
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
