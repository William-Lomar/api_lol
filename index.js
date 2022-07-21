//.env configs
import configEnv from 'dotenv';
configEnv.config();


//config express
import express from 'express'; 
const app = express();
import cors from 'cors';
var corsOptions = {
  orgim: '/',
  optionsSuccessStatus: 200
}
import bodyParser from "body-parser"; 
const { json } = bodyParser;

app.use(cors(corsOptions));
app.use(json());

//Requisições http
import axios from 'axios';
import got from 'got';

//Criação de erros personalizados
import createError from 'http-errors';
import asyncHandler from 'express-async-handler';

//Jquery
import { load } from 'cheerio';

//Kayn Lib de LOL
import { Kayn, REGIONS } from 'kayn';
const keyLol = 'RGAPI-e56afd4c-eb4c-4668-8e4e-d185c6599a4e'
const kayn = Kayn('RGAPI-e56afd4c-eb4c-4668-8e4e-d185c6599a4e');

//RiotAPI Lib de LOL
import { RiotAPI, RiotAPITypes, PlatformId } from '@fightmegg/riot-api';
const rAPI = new RiotAPI(keyLol);

const urlLeagueOfGraphs = 'https://www.leagueofgraphs.com/pt/champions/builds';

// Postgres Configuration
import postgres from 'pg';
import { stringify } from 'querystring';
const { Pool } = postgres;

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

app.get('/campeoes',(req,res)=>{ // pegar todos os campeoes
  // campeoes = { interface
  //   nome:string;
  //   img:string;
  // } http://ddragon.leagueoflegends.com/cdn/12.13.1/img/champion/Aatrox.png

  let campeoes = [];

  async function main(){
    let champs = await rAPI.ddragon.champion.all();
    champs = champs.data;
    
    Object.values(champs).map((champ)=>{
      campeoes.push({
            nome: champ.name,
            img:`http://ddragon.leagueoflegends.com/cdn/${champ.version}/img/champion/${champ.image.full}`
          })
    })

    res.json(campeoes);
  }

  main();
    
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
  // https://lolalytics.com/lol/kennen/vs/yasuo/build/?lane=middle&tier=gold
  let matchup = req.body;       
  let campeoes = matchup.campeoes;
  let rota = matchup.rota; 
  let oponente = matchup.oponente.nome.toLowerCase();
  let oponenteImg = matchup.oponente.img;
  let elo = matchup.elo == 'platina' ? '' : matchup.elo;
  let resultados = [];
  let urlMatchup = '';
  let urlLolalytics = '';

  function realizarMatchup(campeao){
    return new Promise((resolve,reject)=>{
      axios.get(urlMatchup,{
        headers:{
          'User-Agent':' Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
        }
      }).then((response)=>{
        const $ = load(response.data);
        let resultadoPercent = $('#graphDD2').text().replace(/\s+/g, '')
        resultadoPercent = Number(resultadoPercent.replace('%',''));

        let resultadoMatchup = {
          campeao:campeao.nome,
          campeaoImg:campeao.img,
          oponente:oponente,
          oponenteImg:oponenteImg,
          percent:resultadoPercent,
          elo:elo,
          rota:rota,
          linkLeagueOfGraphs: urlMatchup,
          linkLolalytics:urlLolalytics
        }

        resolve(resultadoMatchup);
      }).catch((erro)=>{
        reject(erro);
      })
    })
  }

  async function main(){
    for (let campeao of campeoes) {
      urlLolalytics = `https://lolalytics.com/lol/${campeao.nome.toLowerCase()}/vs/${oponente}/build/?lane=${rota}&tier=${elo}`;
      urlMatchup = `${urlLeagueOfGraphs}/${campeao.nome.toLowerCase()}/${rota}/vs-${oponente}/${elo}`;
      let resultado = await realizarMatchup(campeao)
      resultados.push(resultado)
    }
     
    //ordenar retorno
    let resultadosOrdenados = resultados.sort((a,b)=>{
      if(a.percent > b.percent){
        return -1;
      }
      if(a.percent < b.percent){
        return 1;
      }
      return 0;
    })

    res.json(resultadosOrdenados);
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

  
