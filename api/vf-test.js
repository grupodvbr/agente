export default async function handler(req, res) {
  const base = process.env.VF_BASE;    // https://mercatto.varejofacil.com/api
  const user = process.env.VF_USER;
  const pass = process.env.VF_PASS;

  try {
    // login
    const a = await fetch(`${base}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });
    const j = await a.json();
    const token = j.accessToken;
    if (!token) return res.status(500).json({ step: "auth", raw: j });

    // sanity check
    const me = await fetch(`${base}/v1/myself`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
    });
    const meRaw = await me.text();

    return res.status(me.status).json({ step: "myself", status: me.status, raw: meRaw.slice(0, 2000) });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
