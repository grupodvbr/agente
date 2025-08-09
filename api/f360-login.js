// pages/api/f360-login.js
export default async function handler(req, res) {
  try {
    const BASE = process.env.F360_BASE || "https://financas.f360.com.br";
    const PUBLIC_TOKEN = process.env.F360_PUBLIC_TOKEN;
    const timeout = +(process.env.F360_TIMEOUT_MS || 15000);

    if (!PUBLIC_TOKEN) {
      return res.status(500).json({ error: "F360_PUBLIC_TOKEN ausente no ambiente." });
    }

    const url = `${BASE.replace(/\/+$/, "")}/PublicLoginAPI/DoLogin`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ token: PUBLIC_TOKEN }),
    });

    clearTimeout(timer);

    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /**/ }

    if (!r.ok) {
      return res.status(r.status).json({ error: "Falha no login público F360", status: r.status, raw: text });
    }

    // A doc indica que aqui volta um JWT para usar como Bearer
    return res.status(200).json({ jwt: data?.token || data?.accessToken || data });
  } catch (err) {
    return res.status(500).json({ error: err.name === "AbortError" ? "timeout" : String(err) });
  }
}
