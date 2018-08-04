const compositions = require('./');
const IGNORE = new Set(['code', 'name', 'scie', 'lang', 'grup', 'regn', 'tags']);


function getFactor(map, k) {
  if(IGNORE.has(k)) return 0;
  if(k==='enerc') return 0;
  var n = 0, s = 0;
  for(var r of map.values())
    if(r[k]>0) { s += r[k]; n++; }
  if(!n) return 0;
  console.log(k, s, n);
  return -3*Math.log(s/n)/Math.log(1000);
};

async function main() {
  await compositions.load();
  var map = compositions.corpus;
  var cols = Object.keys(map.get('A001'));
  for(var c of cols) {
    if(c.endsWith('_e')) continue;
    console.log(c, getFactor(map, c));
  }
};
main();
