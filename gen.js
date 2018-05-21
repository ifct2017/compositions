const factors = require('./factors');
const fs = require('fs');
const os = require('os');

var z = `code,factor${os.EOL}`;
for(var [k, v] of factors)
  z += `${k},${v.toExponential().replace('1e+0', '1')}${os.EOL}`;
fs.writeFileSync('factors.csv', z);
