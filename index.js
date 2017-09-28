const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname + "/public" } )
})

app.use(express.static('public'))

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})
