import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const baseUrl = process.env.F360_BASE;
    const publicToken = process.env.F360_PUBLIC_TOKEN;

    // 1. Login
    const loginResponse = await fetch(`${baseUrl}/Login/Autenticar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Token: publicToken })
    });

    const loginData = await loginResponse.json();

    if (!loginData.Token) {
      return res.status(400).json({ error: 'Falha no login F360', response: loginData });
    }

    const jwt = loginData.Token; // pega o Token retornado

    // 2. Buscar vendas
    const { de, ate } = req.query;
    const vendasResponse = await fetch(`${baseUrl}/Vendas?dataInicial=${de}&dataFinal=${ate}`, {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      }
    });

    const vendasData = await vendasResponse.json();
    res.status(200).json(vendasData);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
