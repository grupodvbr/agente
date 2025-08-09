import fetch from 'node-fetch';

async function main() {
  try {
    // URL de teste para garantir que funciona
    const resposta = await fetch('https://jsonplaceholder.typicode.com/todos/1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const dados = await resposta.json();
    console.log('Retorno da API:', dados);

  } catch (erro) {
    console.error('Erro na API:', erro);
  }
}

main();
