const Promise = require('./promise')

const p = new Promise((resolve, reject) => {
  resolve('ok')
})

p.then().then().then(data => {
  console.log('data', data);
})