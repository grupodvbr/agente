export default async function handler(req, res) {
  try {
    const {
      F360_BASE = "",
      F360_PATH_VENDAS = "/integracao/v1/vendas",
      F360_KEY = "",
      F360_BEARER = "",
    } = process.env;

    const { de, ate } = req.query;
    if (!de || !ate) {
      res.status(400).json({ error: "Parâmetros 'de' e 'ate' são obrigatórios (YYYY-MM-DD)." });
      return;
    }

    // Monta a URL do F360 (ajuste F360_BASE / F360_PATH_VENDAS nas envs se precisar)
    const url = new URL(`${F360_BASE.replace(/\/+$/, "")}${F360_PATH_VENDAS}`);
    url.searchParams.set("dataInicial", de);
    url.searchParams.set("dataFinal", ate);

    // Monta os headers conforme o que você tiver configurado
    const headers = {
      Accept: "application/json",
    };
    if (F360_KEY) headers["Chave-Integracao"] = F360_KEY;
    if (F360_BEARER) headers["Authorization"] = `Bearer ${F360_BEARER}`;

    // Faz o fetch com timeout defensivo
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const r = await fetch(url.toString(), {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    const contentType = r.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await r.json().catch(() => null) : await r.text().catch(() => "");

    if (!r.ok) {
      res.status(r.status).json({
        error: "Falha ao consultar F360",
        status: r.status,
        requestedUrl: url.toString(),
        usedHeaders: {
          ...(F360_KEY ? { "Chave-Integracao": "****" } : {}),
          ...(F360_BEARER ? { Authorization: "Bearer ****" } : {}),
          Accept: "application/json",
        },
        raw: body,
      });
      return;
    }

    // 🔎 Ajuste este "parse" conforme o formato real que o F360 retorna
    // Aqui eu só retorno o payload na íntegra + um resumo amigável
    res.status(200).json({
      periodo: { de, ate },
      fonte: "F360",
      payload: body,
    });
  } catch (err) {
    res.status(500).json({ error: err?.name === "AbortError" ? "timeout" : String(err) });
  }
}
