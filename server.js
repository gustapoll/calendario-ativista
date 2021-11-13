const onRequest = require('./functions')

const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 80


app.use(cors())

app.get('/', (req, res) => {
  res.send('Calendario Ativista Server!')
});

app.get('/hashtags', onRequest.hashtags);

app.get('/image', onRequest.image)

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
