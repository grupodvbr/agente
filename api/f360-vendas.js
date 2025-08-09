import fetch from 'node-fetch';

async function main() {
  try {
    const resposta = await fetch('https://api.f360.com.br/sua-rota-aqui', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
        // Coloque outros headers aqui, como token de autenticação
      }
    });

    const dados = await resposta.json();
    console.log('Retorno da API:', dados);

  } catch (erro) {
    console.error('Erro na API F360:', erro);
  }
}

main();
