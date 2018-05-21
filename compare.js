const csv = require('csv');
const fs = require('fs');

function readOld() {
  var data = [];
  return new Promise((fres) => {
    var stream = fs.createReadStream('index-old.csv').pipe(csv.parse({columns: true, comment: '#'}));
    stream.on('data', (r) => data.push(r));
    stream.on('end', () => fres(data));
  });
};

function readNew() {
  var data = [];
  return new Promise((fres) => {
    var stream = fs.createReadStream('index.csv').pipe(csv.parse({columns: true, comment: '#'}));
    stream.on('data', (r) => data.push(r));
    stream.on('end', () => fres(data));
  });
};

function compare(data, datb) {
  var lena = data.length, lenb = datb.length;
  console.log(`L: A=${lena} B=${lenb}`);
  if(lena!==lenb) return console.log('different length');
  for(var i=0, I=lena; i<I; i++) {
    var rowa = data[i], rowb = datb[i];
    var flda = Object.keys(rowa), fldb = Object.keys(rowb);
    var lena = flda.length, lenb = fldb.length;
    if(lena!==lenb) return console.log('different fields');
    for(var fld of flda)
      if(rowa[fld]!==rowb[fld]) return console.log(`R${i}.${fld}: ${rowa[fld]} !== ${rowb[fld]}`);
  }
};

async function main() {
  var oldindex = await readOld();
  var newindex = await readNew();
  compare(oldindex, newindex);
};
main();
