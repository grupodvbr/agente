import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const resposta = await fetch('https://api.f360.com.br/sua-rota-aqui', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
        // coloque outros headers se precisar
      }
    });

    const dados = await resposta.json();
    res.status(200).json(dados);

  } catch (erro) {
    console.error('Erro na API F360:', erro);
    res.status(500).json({ erro: 'Erro ao buscar dados' });
  }
}
