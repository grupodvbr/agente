export default async function handler(req, res) {
  const base = process.env.VF_BASE; // ex: https://mercatto.varejofacil.com/api
  const user = process.env.VF_USER;
  const pass = process.env.VF_PASS;

  try {
    // 1) LOGIN
    const authResp = await fetch(`${base}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });

    const setCookie = authResp.headers.get("set-cookie") || "";
    const authText = await authResp.text();
    let auth; try { auth = JSON.parse(authText); } catch {}
    const token = auth?.accessToken || auth?.token || auth?.access_token;

    // 2) chama /v1/myself usando cookie + (opcional) bearer
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (setCookie) headers.cookie = setCookie;

    const me = await fetch(`${base}/v1/myself`, { headers });
    const meText = await me.text();

    return res.status(me.status).json({
      step: "myself",
      status: me.status,
      used: { bearer: !!token, cookie: !!setCookie },
      authRespStatus: authResp.status,
      authSetCookiePresent: !!setCookie,
      authHeadersSample: Object.fromEntries([...authResp.headers].slice(0,6)),
      authBodySample: authText.slice(0,400),
      raw: meText.slice(0,1200)
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
