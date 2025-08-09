// pages/api/f360-vendas.js
function ymd(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function ontem() {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  const s = ymd(d);
  return { de: s, ate: s };
}

async function f360Login() {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const r = await fetch(`${baseUrl}/api/f360-login`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Login F360 falhou com status ${r.status}`);
  const j = await r.json();
  const jwt = j?.jwt || j?.token || j?.accessToken;
  if (!jwt || typeof jwt !== "string") throw new Error("JWT não retornado pelo login público do F360.");
  return jwt;
}

export default async function handler(req, res) {
  try {
    const { de: deQ, ate: ateQ } = req.query || {};
    const { de, ate } = (deQ && ateQ) ? { de: deQ, ate: ateQ } : ontem();

    const BASE = process.env.F360_BASE || "https://financas.f360.com.br";
    const timeout = +(process.env.F360_TIMEOUT_MS || 15000);

    // 1) Login público → pega JWT
    const jwt = await f360Login();

    // 2) Lista Parcelas de Cartões (paginado, até 1000 por página segundo a doc)
    // doc: GET /ParcelasDeCartoesPublicAPI/ListarParcelasDeCartoes?pagina=1&tipo=ambos|Receita&inicio=yyyy-MM-dd&fim=yyyy-MM-dd&tipoDatas=venda
    const url = new URL(`${BASE.replace(/\/+$/, "")}/ParcelasDeCartoesPublicAPI/ListarParcelasDeCartoes`);
    url.searchParams.set("pagina", "1");
    url.searchParams.set("tipo", "Receita");     // foca em recebimentos
    url.searchParams.set("inicio", de);
    url.searchParams.set("fim", ate);
    url.searchParams.set("tipoDatas", "venda");  // somar pelo dia da venda

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const r = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${jwt}`,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* pode vir HTML em erro */ }

    if (!r.ok) {
      return res.status(r.status).json({
        error: "Falha ao consultar F360 (ParcelasDeCartoes)",
        requestedUrl: url.toString(),
        status: r.status,
        raw: text?.slice(0, 4000),
      });
    }

    // 3) Somatório — ajuste o campo conforme o payload real (ValorLiquido, ValorBruto etc.)
    const itens = Array.isArray(data?.Itens || data?.itens || data) ? (data.Itens || data.itens || data) : [];
    let totalLiquido = 0, totalBruto = 0, qtd = 0;

    for (const p of itens) {
      // Nomes variam — tentamos cobrir os mais comuns:
      const vl = Number(
        p?.ValorLiquido ?? p?.valorLiquido ?? p?.valor_liquido ?? p?.liquido ?? p?.valor || 0
      );
      const vb = Number(
        p?.ValorBruto ?? p?.valorBruto ?? p?.valor_bruto ?? p?.bruto ?? 0
      );
      if (!Number.isNaN(vl)) totalLiquido += vl;
      if (!Number.isNaN(vb)) totalBruto += vb;
      qtd++;
    }

    return res.status(200).json({
      periodo: { de, ate },
      fonte: "F360 (ParcelasDeCartoesPublicAPI)",
      qtdParcelas: qtd,
      totalLiquido: Number(totalLiquido.toFixed(2)),
      totalBruto: Number(totalBruto.toFixed(2)),
      // payload: data, // descomente se quiser ver o bruto
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
