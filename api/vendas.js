// api/vendas.js
// Vercel (Node.js) API Route – integra com Mercatto VarejoFácil

const BASE = process.env.VF_BASE || "";        // ex: https://mercatto.varejofacil.com
const TOKEN = process.env.VF_TOKEN || "";      // sua Chave-Integracao

// Valida formato YYYY-MM-DD
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function handler(req, res) {
  try {
    // CORS básico (se for chamar via navegador direto)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (!BASE || !TOKEN) {
      return res.status(500).json({
        error: "Configuração ausente",
        hint: "Defina VF_BASE e VF_TOKEN nas variáveis de ambiente do Vercel.",
      });
    }

    // Query params: ?de=YYYY-MM-DD&ate=YYYY-MM-DD
    const { de, ate } = req.query;
    if (!isDate(de) || !isDate(ate)) {
      return res.status(400).json({
        error: "Parâmetros inválidos",
        hint: "Use ?de=YYYY-MM-DD&ate=YYYY-MM-DD",
      });
    }

    // Monta URL do Mercatto (rota de integração)
    const url = `${BASE.replace(/\/+$/, "")}/integracao/v1/vendas?dataInicial=${de}&dataFinal=${ate}`;

    // Chamada com a Chave-Integracao
    const upstream = await fetch(url, {
      headers: {
        "Chave-Integracao": TOKEN,
        "Accept": "application/json",
      },
    });

    const text = await upstream.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    // Se o Mercatto respondeu OK, repassa o JSON. Caso contrário, traz depuração.
    if (upstream.ok && json !== null) {
      return res.status(200).json(json);
    } else {
      return res.status(upstream.status || 502).json({
        error: "Falha ao consultar Mercatto",
        status: upstream.status,
        requestedUrl: url,
        usedHeaders: { "Chave-Integracao": "****", Accept: "application/json" },
        raw: text, // útil pra debug se o retorno vier em HTML/erro
      });
    }
  } catch (err) {
    return res.status(500).json({
      error: "Erro interno",
      message: err?.message,
    });
  }
}
