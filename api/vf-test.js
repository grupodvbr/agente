export default async function handler(req, res) {
  const base = process.env.VF_BASE; // ex: https://mercatto.varejofacil.com/api
  const user = process.env.VF_USER;
  const pass = process.env.VF_PASS;

  try {
    // 1) LOGIN: espera accessToken E Set-Cookie
    const authResp = await fetch(`${base}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });

    const setCookie = authResp.headers.get("set-cookie") || "";
    const authText = await authResp.text();
    let auth;
    try { auth = JSON.parse(authText); } catch {}

    // pega accessToken se existir
    const token = auth?.accessToken || auth?.token || auth?.access_token;

    // 2) Monta headers para próxima chamada
    const headers = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (setCookie) headers["cookie"] = setCookie; // <- usa a sessão

    // 3) Testa /v1/myself usando cookie (+ bearer se existir)
    const meResp = await fetch(`${base}/v1/myself`, { headers });
    const meText = await meResp.text();

    return res.status(meResp.status).json({
      step: "myself",
      status: meResp.status,
      used: {
        bearer: Boolean(token),
        cookie: Boolean(setCookie)
      },
      raw: meText.slice(0, 2000)
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
