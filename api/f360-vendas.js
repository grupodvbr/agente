// pages/api/f360-vendas.js
function ymd(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function ontem() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  const s = ymd(d);
  return { de: s, ate: s };
}

async function f360Login({ base, publicToken, timeoutMs }) {
  const url = `${base.replace(/\/+$/, "")}/PublicLoginAPI/DoLogin`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({ token: publicToken }),
  }).catch((e) => { throw new Error(`fetch login: ${e.name}`); });
  clearTimeout(timer);

  const raw = await r.text();
  let data; try { data = JSON.parse(raw); } catch { /* às vezes volta string */ }

  if (!r.ok) {
    throw new Error(`login HTTP ${r.status} – raw=${raw?.slice(0,300)}`);
  }
  const jwt = data?.token || data?.accessToken || data; // doc varia o campo
  if (!jwt || typeof jwt !== "string") {
    throw new Error(`login ok, mas não veio JWT. payload=${raw?.slice(0,300)}`);
  }
  return jwt;
}

export default async function handler(req, res) {
  try {
    const BASE = process.env.F360_BASE || "https://financas.f360.com.br";
    const PUBLIC_TOKEN = process.env.F360_PUBLIC_TOKEN;
    const timeoutMs = +(process.env.F360_TIMEOUT_MS || 15000);

    if (!PUBLIC_TOKEN) {
      return res.status(500).json({ error: "F360_PUBLIC_TOKEN ausente no ambiente." });
    }

    const { de: qDe, ate: qAte } = req.query || {};
    const { de, ate } = (qDe && qAte) ? { de: qDe, ate: qAte } : ontem();

    // 1) Login público → JWT
    const jwt = await f360Login({ base: BASE, publicToken: PUBLIC_TOKEN, timeoutMs });

    // 2) Parcelas de Cartões – tipo=Receita, tipoDatas=venda
    const url = new URL(`${BASE.replace(/\/+$/, "")}/ParcelasDeCartoesPublicAPI/ListarParcelasDeCartoes`);
    url.searchParams.set("pagina", "1");
    url.searchParams.set("tipo", "Receita");
    url.searchParams.set("inicio", de);
    url.searchParams.set("fim", ate);
    url.searchParams.set("tipoDatas", "venda");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const r = await fetch(url.toString(), {
      headers: { "Authorization": `Bearer ${jwt}`, "Accept": "application/json" },
      signal: controller.signal,
    }).catch((e) => { throw new Error(`fetch parcelas: ${e.name}`); });
    clearTimeout(timer);

    const raw = await r.text();
    let data; try { data = JSON.parse(raw); } catch {}

    if (!r.ok) {
      return res.status(r.status).json({
        error: "Falha ao consultar F360 (ParcelasDeCartoes)",
        requestedUrl: url.toString(),
        status: r.status,
        raw: raw?.slice(0, 1000),
      });
    }

    // payload pode vir como { Itens: [...] } ou só [...]
    const itens = Array.isArray(data?.Itens) ? data.Itens
                : Array.isArray(data?.itens) ? data.itens
                : Array.isArray(data) ? data : [];

    let totalLiquido = 0, totalBruto = 0, qtd = 0;
    for (const p of itens) {
      const vl = Number(p?.ValorLiquido ?? p?.valorLiquido ?? p?.valor_liquido ?? p?.liquido ?? p?.valor ?? 0);
      const vb = Number(p?.ValorBruto   ?? p?.valorBruto   ?? p?.valor_bruto   ?? p?.bruto   ?? 0);
      if (!Number.isNaN(vl)) totalLiquido += vl;
      if (!Number.isNaN(vb)) totalBruto   += vb;
      qtd++;
    }

    return res.status(200).json({
      periodo: { de, ate },
      fonte: "F360 ParcelasDeCartoes",
      qtdParcelas: qtd,
      totalLiquido: +totalLiquido.toFixed(2),
      totalBruto: +totalBruto.toFixed(2),
      // debugRaw: data, // habilite se quiser ver o payload
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
