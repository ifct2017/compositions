const columns = require('./columns');
const fs = require('fs');
const os = require('os');

var z = `code,actual${os.EOL}`;
for(var [k, v] of columns)
  z += `${k},${v}${os.EOL}`;
fs.writeFileSync('columns.csv', z);
