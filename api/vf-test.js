export default async function handler(req, res) {
  const base = process.env.VF_BASE;        // ex.: https://mercatto.varejofacil.com/api
  const user = process.env.VF_USER;
  const pass = process.env.VF_PASS;

  const { de = "2025-08-01", ate = "2025-08-08" } = req.query;

  try {
    // 1) LOGIN
    const authUrl = `${base}/auth`;
    const authResp = await fetch(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });
    const authText = await authResp.text();
    if (!authResp.ok) {
      return res.status(authResp.status).json({ step: "auth", url: authUrl, status: authResp.status, raw: authText });
    }
    let authJson; try { authJson = JSON.parse(authText); } catch {}
    const token =
      authJson?.accessToken ||
      authJson?.token ||
      authJson?.access_token ||
      authJson?.data?.token;

    if (!token) {
      return res.status(500).json({ step: "auth-parse", url: authUrl, note: "Faltou accessToken", raw: authText.slice(0, 800) });
    }

    // 2) VENDAS
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
      raw: vendasText.slice(0, 2000)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erro inesperado" });
  }
}
