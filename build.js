const descriptions = require('@ifct2017/descriptions')
const groups = require('@ifct2017/groups');
const parse = require('csv-parse');
const path = require('path');
const fs = require('fs');
const os = require('os');

const BASE = ['code', 'name', 'scie', 'lang', 'grup', 'regn', 'tags'];


function round(val) {
  return Math.round(val*1e+12)/1e+12;
};
function significantDigits(n) {
  return n.toExponential().replace(/e[\+\-0-9]*$/, '').replace( /^0\.?0*|\./, '').length;
};

function readCsv(pth, fn, acc) {
  return new Promise((fres) => {
    var stream = fs.createReadStream(pth).pipe(parse({columns: true, comment: '#'}));
    stream.on('data', (r) => fn(acc, r));
    stream.on('end', () => fres(acc));
  });
};

var dat = {
  code: [],
  name: [],
  scie: [],
  lang: [],
  grup: [],
  regn: [],
  tags: [],
};
var di = 0;
var map = new Map();
var factors = null;
var renames = null;
var sums = null;
var orders = null;
groups.load();

function valParse(val, code, dat, i) {
  var f = factors.get(code);
  var fn = parseFloat(f.replace(/\*.*/, ''));
  var fi = f.indexOf('*'), fk = fi>=0? f.substring(fi+1):null;
  var z = (parseFloat(val)||0)*fn*(fk? parseFloat(dat[fk][i])||0:1);
  z = parseFloat(z.toExponential((significantDigits(fn)||1)-1));
  return round(z);
};

function nameSci(str) {
  var bgn = str.lastIndexOf('(');
  if(bgn<0) return '';
  var end = str.lastIndexOf(')');
  end = end<0? str.length:end;
  var sci = str.substring(bgn+1, end).trim();
  var spc = sci.search(/\s/g);
  return spc>=0 && sci!=='small intestine'? sci:'';
};
function nameBas(str) {
  var sci = nameSci(str);
  if(!sci) return str.trim();
  return str.replace(new RegExp(`\\(\\s*${sci}\\s*\\)`), '').trim();
};
function readAssetRow(row) {
  var cod = row.code.trim();
  var old = map.has(cod);
  var nam = nameBas(row.name);
  var sci = nameSci(row.name);
  var i = old? map.get(cod):map.set(cod, di)&&di++;
  dat.code[i] = cod;
  dat.name[i] = old && dat.name[i].length>nam.length? dat.name[i]:nam;
  dat.scie[i] = old && dat.scie[i].length>sci.length? dat.scie[i]:sci;
  dat.lang[i] = (descriptions.corpus.get(cod)||{desc: ''}).desc;
  dat.grup[i] = groups.corpus.get(cod[0]).group;
  dat.regn[i] = parseInt(row.regn.trim(), 10);
  dat.tags[i] = groups.corpus.get(cod[0]).tags.trim();
  for(var k in row) {
    if(BASE.includes(k)) continue;
    var val = row[k].trim().split('±'), kt = renames.get(k)||k;
    if(!dat[kt]) { dat[kt] = []; dat[kt+'_e'] = []; }
    dat[kt][i] = valParse(val[0]||'0', k, dat, i);
    dat[kt+'_e'][i] = valParse(val[1]||'0', k, dat, i);
  }
};
function readAsset(pth) {
  return new Promise((fres) => {
    var stm = fs.createReadStream(pth).pipe(parse({columns: true, comment: '#'}));
    stm.on('data', readAssetRow);
    stm.on('end', () => fres());
  });
};

function nullToZero(d) {
  var K = Object.keys(d);
  for(var k of K) {
    for(var i=0; i<di; i++)
      d[k][i] = d[k][i]!=null? d[k][i]:0;
  }
};
function sumColumns(d, i, ks) {
  var z = 0;
  for(var k of ks)
    z += d[k][i];
  return z;
};
function sumAll(d) {
  for(var [k, exp] of sums) {
    var sumk = exp.replace(/\s/g, '').split('+'); d[k] = [];
    for(var i=0; i<di; i++)
      d[k][i] = round(sumColumns(d, i, sumk));
  }
};
function orderAll(d) {
  var z = {};
  for(var k in d) {
    if(k in z) continue;
    for(var ak of orders.get(k)||[]) {
      z[ak] = d[ak];
      var ake = ak+'_e';
      if(ake in d) z[ake] = d[ake];
    }
    z[k] = d[k];
  }
  return z;
};

async function build() {
  await descriptions.load();
  factors = await readCsv('configs/factors.csv', (acc, r) => acc.set(r.code, r.factor), new Map());
  renames = await readCsv('configs/renames.csv', (acc, r) => acc.set(r.code, r.actual), new Map());
  sums = await readCsv('configs/sums.csv', (acc, r) => acc.set(r.code, r.expression), new Map());
  orders = await readCsv('configs/orders.csv', (acc, r) => {
    var arr = acc.get(r.before)||[];
    acc.set(r.before, arr);
    arr.push(r.code);
  }, new Map());
  for(var file of fs.readdirSync('assets'))
    await readAsset(path.join('assets', file));
  nullToZero(dat);
  sumAll(dat);
  dat = orderAll(dat);
  var ks = Object.keys(dat), z = ks.join()+os.EOL;
  for(var i=0; i<di; i++) {
    for(var k of ks) {
      var v = dat[k][i];
      z += JSON.stringify(v==null? 0:v)+',';
    }
    z = z.substring(0, z.length-1)+os.EOL;
  }
  fs.writeFileSync('index.csv', z);
};
build();
