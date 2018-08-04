const fs = require('fs');
const os = require('os');
const compositions = require('./');


const IGNORE = new Set(['code', 'name', 'scie', 'lang', 'grup', 'regn', 'tags']);
const UNIT = new Map([
  [0, 'g'],
  [3, 'mg'],
  [6, 'ug'],
  [9, 'ng'],
]);


function getType(k) {
  if(k==='regn') return 'INT';
  if(IGNORE.has(k)) return 'TEXT';
  return 'REAL';
};

function getFactor(map, k) {
  if(IGNORE.has(k)) return 0;
  if(k==='enerc') return 0;
  var n = 0, s = 0;
  for(var r of map.values())
    if(r[k]>0) { s += r[k]; n++; }
  if(!n) return 0;
  return -3*Math.round(Math.log(s/n)/Math.log(1000));
};

function getUnit(k, f) {
  if(IGNORE.has(k)) return null;
  if(k==='enerc') return 'kJ';
  return UNIT.get(f);
};

async function main() {
  await compositions.load();
  var map = compositions.corpus;
  var cols = Object.keys(map.get('A001'));
  var z = `code,type,fact,unit${os.EOL}`;
  for(var c of cols) {
    if(c.endsWith('_e')) continue;
    var code = c;
    var type = getType(c);
    var fact = getFactor(map, c);
    var unit = getUnit(c, fact)||'';
    z += `${code},${type},${fact},${unit}${os.EOL}`;
  }
  fs.writeFileSync('meta.csv', z);
};
main();
