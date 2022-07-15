import configEnv from 'dotenv';
configEnv.config();

import express from 'express'; 

import bodyParser from "body-parser"; 
const { json } = bodyParser;
import axios from 'axios';

const app = express();
import cors from 'cors';
import createError from 'http-errors';
import asyncHandler from 'express-async-handler';
import { load } from 'cheerio';
import got from 'got';
const url = 'https://www.leagueofgraphs.com/pt/champions/builds';

var corsOptions = {
  orgim: '/',
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions));
app.use(json());

// Postgres Configuration
import postgres from 'pg';
const { Pool } = postgres


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
});

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
    console.error('Unexpected Error:', err);
    process.exit(-1);
});

const rootUrl = '/api';

app.get(`/teste`, (req, res) => { 
  res.json({info: 'Node.js, Express e API Postgres'}); 
});

app.post('/user', asyncHandler(async (req, res, next) =>{
  pool.query('SELECT * FROM  usersTeste',(erro,results)=>{
    if(erro){
      return next(createError(500,"Algo deu errado!"))
    }else{
      res.json(results.rows)
    }
  })
})
);

app.get('/matchup',(req,res)=>{
  axios.get('https://www.leagueofgraphs.com/pt/champions/builds/kennen/vs-ahri',{
      headers:{
        'User-Agent':' Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
      }
    }).then((response)=>{
      console.log(response);
      const $ = load(response.data);
      let resultado = $('#graphDD2').text().replace(/\s+/g, '')
      console.log(resultado)

    }).catch((erro)=>{
      
        console.log("Ocorreu um erro: "+erro)
    })

    res.json("Calmai que já vou saber, blz?")
})

app.post('/matchupOriginal',(req,res)=>{ // Original não trabalha de forma sincrona, envia a resposta do serve antes dos resultados dos get
  //kennen/middle/vs-yasuo/gold
    let matchup = req.body;
    let campeoes = matchup.campeoes;
    let rota = matchup.rota; 
    let oponente = matchup.oponente;
    let elo = matchup.elo;
    let resultados = [];
    let urlMatchup = '';


    campeoes.map((campeao)=>{
      console.log("Entrei no looping");
      urlMatchup = `${url}/${campeao}/${rota}/vs-${oponente}/${elo}`;
      
      axios.get(urlMatchup,{
        headers:{
          'User-Agent':' Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
        }
      }).then((response)=>{
        const $ = load(response.data);
        let resultadoPercent = $('#graphDD2').text().replace(/\s+/g, '')
  
        let resultadoMatchup = {
          campeao:campeao,
          oponente:oponente,
          percent:resultadoPercent
        }

        console.log(resultadoMatchup);
        
        resultados.push(resultadoMatchup)

      }).catch((erro)=>{
        console.log("Ocorreu um erro: "+erro)
        res.json("Ocorreu um erro");
      })
    })
    
    res.json("Será assim funciona?");

})

app.post('/matchup',(req,res)=>{ // Este metodo utilizar funções assincronas com for, cada repetição realiza uma solicitação e aguarda a resposta
  //kennen/middle/vs-yasuo/gold
  let matchup = req.body;       
  let campeoes = matchup.campeoes;
  let rota = matchup.rota; 
  let oponente = matchup.oponente;
  let elo = matchup.elo == 'platina' ? '' : matchup.elo;
  let resultados = [];
  let urlMatchup = '';

  function realizarMatchup(campeao){
    return new Promise((resolve,reject)=>{
      axios.get(urlMatchup,{
        headers:{
          'User-Agent':' Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
        }
      }).then((response)=>{
        const $ = load(response.data);
        let resultadoPercent = $('#graphDD2').text().replace(/\s+/g, '')
  
        let resultadoMatchup = {
          campeao:campeao,
          oponente:oponente,
          percent:resultadoPercent,
          elo:elo,
          rota:rota
        }

        resolve(resultadoMatchup)
      }).catch((erro)=>{
        reject(erro)
      })
    })
  }

  async function main(){
    for (const campeao of campeoes) {
      urlMatchup = `${url}/${campeao}/${rota}/vs-${oponente}/${elo}`;
      const resultado = await realizarMatchup(campeao)
      resultados.push(resultado)
    }
     
    console.log(resultados);
    res.json(resultados)
  }

  main();
})

app.post('/matchupComMap',(req,res)=>{ // Aq se utiliza o map, cria todas as Promisses de uma vez e trabalha nelas em paralelo e entrega o resultado de uma vez
   //kennen/middle/vs-yasuo/gold
  // let matchup = req.body;       matchup.campeoes
 let campeoes = ['irelia','yasuo','kennen'];
 // let rota = matchup.rota; 
 // let oponente = matchup.oponente;
 // let elo = matchup.elo;
 let resultados = [];
 let urlMatchup = 'https://www.leagueofgraphs.com/pt/champions/builds/kennen/middle/vs-yasuo/gold';

  function realizarMatchup(){
    return new Promise((resolve,reject)=>{
      axios.get(urlMatchup,{
        headers:{
          'User-Agent':' Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
        }
      }).then((response)=>{
        const $ = load(response.data);
        let resultadoPercent = $('#graphDD2').text().replace(/\s+/g, '')
  
        let resultadoMatchup = {
          campeao: campeao,
          oponente: oponente,
          percent:resultadoPercent
        }

        resolve(resultadoMatchup)
      }).catch((erro)=>{
        reject(erro)
      })
    })
  }

  async function main(){
    let resultado;
    let resultadosPromise = campeoes.map(async (campeao)=>{

      resultado = await realizarMatchup();
      return resultado;
    })

    resultados = await Promise.all(resultadosPromise);

    console.log(resultados);
    res.json({message:"Também funciona dessa maneira",results:resultados});
  }

  main()


})

app.get('/testePromise',(req,res)=>{
  let matchup = req.body;
  let campeoes = matchup.campeoes;
  let rota = matchup.rota; 
  let oponente = matchup.oponente;
  let elo = matchup.elo;
  let resultados = [];
  let urlMatchup = 'testes de acesso à variaveis';

  function testes(){
    console.log(urlMatchup)
    resultados = ['testes','criando array global'];
  }

  testes()
  
  console.log(resultados)
  res.json("Testando umas paradas aq mano")
})


// Escuta a porta especificada, caso contrário 3080 
const server = app.listen(3080, () => { 
  console.log(`Server Running: http://localhost:3080`); 
});

// Fazendo o log do erro / Capturando erros do servidor
app.use((error, req, res, next) => {
  console.log('Error status: ', error.status)
  console.log('Message: ', error.message)

  // Seta o HTTP Status Code
  res.status(500)
  // Envia a resposta
  res.json({ message: error.message })
})



/** 
* O sinal SIGTERM é um sinal genérico usado para causar o 
término do programa *. Ao contrário do SIGKILL , este sinal pode ser bloqueado, 
* manipulado e ignorado. É a maneira normal de pedir educadamente que um 
programa * termine. O comando shell kill gera 
* SIGTERM por padrão. 
*/ 
process.on('SIGTERM', () => { 
    server.close(() => { 
        console.log('Servidor Fechado: Processo Finalizado!'); 
    }); 
});

  
