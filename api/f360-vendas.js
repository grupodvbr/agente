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
    const {
      F360_BASE = "",
      F360_PATH_VENDAS = "/integracao/v1/vendas",
      F360_KEY = "",
      F360_BEARER = "",
    } = process.env;
    const { de: deQ, ate: ateQ } = req.query || {};
    const { de, ate } = (deQ && ateQ) ? { de: deQ, ate: ateQ } : ontem();

    const { de, ate } = req.query;
    if (!de || !ate) {
      res.status(400).json({ error: "Parâmetros 'de' e 'ate' são obrigatórios (YYYY-MM-DD)." });
      return;
    }
    const BASE = process.env.F360_BASE || "https://financas.f360.com.br";
    const timeout = +(process.env.F360_TIMEOUT_MS || 15000);

    // Monta a URL do F360 (ajuste F360_BASE / F360_PATH_VENDAS nas envs se precisar)
    const url = new URL(`${F360_BASE.replace(/\/+$/, "")}${F360_PATH_VENDAS}`);
    url.searchParams.set("dataInicial", de);
    url.searchParams.set("dataFinal", ate);
    // 1) Login público → pega JWT
    const jwt = await f360Login();

    // Monta os headers conforme o que você tiver configurado
    const headers = {
      Accept: "application/json",
    };
    if (F360_KEY) headers["Chave-Integracao"] = F360_KEY;
    if (F360_BEARER) headers["Authorization"] = `Bearer ${F360_BEARER}`;
    // 2) Lista Parcelas de Cartões (paginado, até 1000 por página segundo a doc)
    // doc: GET /ParcelasDeCartoesPublicAPI/ListarParcelasDeCartoes?pagina=1&tipo=ambos|Receita&inicio=yyyy-MM-dd&fim=yyyy-MM-dd&tipoDatas=venda
    const url = new URL(`${BASE.replace(/\/+$/, "")}/ParcelasDeCartoesPublicAPI/ListarParcelasDeCartoes`);
    url.searchParams.set("pagina", "1");
    url.searchParams.set("tipo", "Receita");     // foca em recebimentos
    url.searchParams.set("inicio", de);
    url.searchParams.set("fim", ate);
    url.searchParams.set("tipoDatas", "venda");  // somar pelo dia da venda

    // Faz o fetch com timeout defensivo
const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const timer = setTimeout(() => controller.abort(), timeout);

const r = await fetch(url.toString(), {
      headers,
      headers: {
        "Authorization": `Bearer ${jwt}`,
        "Accept": "application/json",
      },
signal: controller.signal,
});

clearTimeout(timer);

    const contentType = r.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await r.json().catch(() => null) : await r.text().catch(() => "");
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* pode vir HTML em erro */ }

if (!r.ok) {
      res.status(r.status).json({
        error: "Falha ao consultar F360",
        status: r.status,
      return res.status(r.status).json({
        error: "Falha ao consultar F360 (ParcelasDeCartoes)",
requestedUrl: url.toString(),
        usedHeaders: {
          ...(F360_KEY ? { "Chave-Integracao": "****" } : {}),
          ...(F360_BEARER ? { Authorization: "Bearer ****" } : {}),
          Accept: "application/json",
        },
        raw: body,
        status: r.status,
        raw: text?.slice(0, 4000),
});
      return;
}

    // 🔎 Ajuste este "parse" conforme o formato real que o F360 retorna
    // Aqui eu só retorno o payload na íntegra + um resumo amigável
    res.status(200).json({
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
      fonte: "F360",
      payload: body,
      fonte: "F360 (ParcelasDeCartoesPublicAPI)",
      qtdParcelas: qtd,
      totalLiquido: Number(totalLiquido.toFixed(2)),
      totalBruto: Number(totalBruto.toFixed(2)),
      // payload: data, // descomente se quiser ver o bruto
});
  } catch (err) {
    res.status(500).json({ error: err?.name === "AbortError" ? "timeout" : String(err) });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
}
}
