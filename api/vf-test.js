export default async function handler(req, res) {
  const base = process.env.VF_BASE; // ex.: https://mercatto.varejofacil.com/api
  const user = process.env.VF_USER;
  const pass = process.env.VF_PASS;

  try {
    // 1) LOGIN
    const auth = await fetch(`${base}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });

    const setCookie = auth.headers.get("set-cookie") || "";
    const txt = await auth.text();
    let j; try { j = JSON.parse(txt); } catch {}
    const token = j?.accessToken || j?.token || j?.access_token;

    if (!auth.ok || !token) {
      return res.status(auth.status).json({ step: "auth", status: auth.status, raw: txt.slice(0, 1000) });
    }

    // 2) /v1/myself com Authorization = <token> (sem 'Bearer')
    const headers = { Authorization: token, Accept: "application/json" };
    // se quiser, podemos mandar o cookie junto; não deve atrapalhar
    if (setCookie) headers.cookie = setCookie;

    const me = await fetch(`${base}/v1/myself`, { headers });
    const meText = await me.text();

    return res.status(me.status).json({
      step: "myself",
      status: me.status,
      used: { authorization: "raw token", cookie: !!setCookie },
      raw: meText.slice(0, 2000)
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
