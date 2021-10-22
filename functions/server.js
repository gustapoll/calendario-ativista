// const onRequest = require('./functions')

const express = require('express')
const app = express()
const port = process.env.PORT || 80


const constants = {
  HASHTAG_LABELS: [
    "#coleraalegria",
    "#desenhospelademocracia",
    "#designativista",
    "#foragarimpoforacovid",
    "#projetemos",
    "#mariellepresente",
  ],

  TAGS: [
    "amazonia",
    "aquecimento global",
    "brumadinho",
    "crime ambiental",
    "desastre ambiental",
    "fumaça",
    "indígenas",
    "meio ambiente",
    "mineração",
    "oleo ",
    "petroleo",
    "praia contaminada",
    "queimadas",
    "previdência",
    "reforma trabalhista",
    "arte",
    "bolsonaro",
    "brasil",
    "brazilresists",
    "caixa2dobolsonaro",
    "cirogomes",
    "cultura",
    "democracia",
    "dilma",
    "direitoshumanos",
    "ditaduranuncamais",
    "diversidade",
    "doria",
    "educação",
    "educaçãoinclusiva",
    "eleicoes2018",
    "eleições2018",
    "elenunca",
    "esquerda",
    "facistas",
    "feminismo",
    "foratemer",
    "golpista",
    "grevegeral",
    "haddad",
    "história",
    "homofobia",
    "impeachmentbolsonaro",
    "justiça",
    "lgbt",
    "lgbtq",
    "liberdade",
    "lulalivre",
    "lula",
    "machismo",
    "mariellevive ",
    "mexeucomumamexeucomtodas",
    "moro",
    "movimentonegro",
    "mulherescontrabolsonaro",
    "mulheresnapolitica",
    "mulheresunidaspelademocracia",
    "negra",
    "ninguemsoltaamãodeninguem",
    "quemmatoumarielle",
    "racismo",
    "redeglobo",
    "resistencia",
    "sociedade",
    "tsunamidaeducação",
    "vazajato",
    "vidasnegrasimportam",
  ].sort(),


  // ID of the backup folder in Google Drive
  FOLDER_ID: "1UlkoCZ1jjEdPI8CwC2dViBFI-QyUVaK7",
};

onRequest = {
  hashtags: (request, response) => {
    response.send({"hashtags": constants.HASHTAG_LABELS, "tags": constants.TAGS});
  }
}

app.get('/', (req, res) => {
  res.send('Calendario Ativista Server!')
});

app.get('/hashtags', onRequest.hashtags);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
