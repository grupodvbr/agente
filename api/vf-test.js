export default async function handler(req, res) {
  const base = process.env.VF_BASE;        // ex: https://villachopp.varejofacil.com/api
  const user = process.env.VF_USER;        // seu login do VF
  const pass = process.env.VF_PASS;        // sua senha do VF

  const { de = "2025-08-01", ate = "2025-08-08" } = req.query;

  try {
    // 1) LOGIN: POST /auth
    const authUrl = `${base}/auth`;
    const authResp = await fetch(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });

    const authText = await authResp.text();
    if (!authResp.ok) {
      return res.status(authResp.status).json({
        step: "auth",
        url: authUrl,
        status: authResp.status,
        raw: authText
      });
    }

    let authJson;
    try { authJson = JSON.parse(authText); } catch { /* ignore */ }

    // tenta achar o token nos campos mais comuns
    const token = authJson?.token || authJson?.access_token || authJson?.jwt || authJson?.data?.token;
    if (!token) {
      return res.status(500).json({
        step: "auth-parse",
        url: authUrl,
        note: "Não encontrei o token na resposta do /auth.",
        raw: authText
      });
    }

    // 2) DADOS: GET /v1/vendas?dataInicial&dataFinal
    const vendasUrl = new URL(`${base}/v1/vendas`);
    vendasUrl.searchParams.set("dataInicial", de);
    vendasUrl.searchParams.set("dataFinal", ate);

    const vendasResp = await fetch(vendasUrl.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
    });

    const vendasText = await vendasResp.text();
    return res.status(vendasResp.status).json({
      step: "vendas",
      requestedUrl: vendasUrl.toString(),
      status: vendasResp.status,
      raw: vendasText.slice(0, 2000) // devolve um trecho p/ debug
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erro inesperado" });
  }
}
