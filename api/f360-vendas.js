import fetch from 'node-fetch';

async function main() {
  try {
    const resposta = await fetch('https://api.f360.com.br/sua-rota-aqui', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
        // coloque outros headers se precisar
      }
    });

    const dados = await resposta.json();
    console.log(dados); // Mostra no terminal

  } catch (erro) {
    console.error('Erro na API F360:', erro);
  }
}

main();
