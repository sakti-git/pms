const bcrypt = require('bcrypt')

const saltRounds = 10;
const myPlaintextPassword = '54321'
const hash = bcrypt.hashSync(myPlaintextPassword, saltRounds);

console.log(hash);
