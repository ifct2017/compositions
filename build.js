const path  = require('path');
const fs    = require('fs');
const os    = require('os');
const build = require('extra-build');
const csv   = require('csv-parse');
const columns      = require('@ifct2017/columns');
const descriptions = require('@ifct2017/descriptions');
const groups       = require('@ifct2017/groups');

const owner = 'ifct2017';
const repo  = build.readMetadata('.').name.replace(/@.+\//g, '');
const BASE  = ['code', 'name', 'scie', 'lang', 'grup', 'regn', 'tags'];




function round(val) {
  return Math.round(val*1e+12)/1e+12;
}

function significantDigits(n) {
  return n.toExponential().replace(/e[\+\-0-9]*$/, '').replace( /^0\.?0*|\./, '').length;
}

function readCsv(pth, fn, acc) {
  return new Promise(resolve => {
    var stream = fs.createReadStream(pth).pipe(csv.parse({columns: true, comment: '#'}));
    stream.on('data', r => fn(acc, r));
    stream.on('end', () => resolve(acc));
  });
}


async function generateIndexCsv() {
  var dat = {
    code: [],
    name: [],
    scie: [],
    lang: [],
    grup: [],
    regn: [],
    tags: [],
  };
  var di  = 0;
  var map = new Map();
  var factors = null;
  var renames = null;
  var sums    = null;
  var orders  = null;
  var descCorpus;
  var grupCorpus;
  groups.load();


  function valParse(val, code, dat, i) {
    var f  = factors.get(code);
    var fn = parseFloat(f.replace(/\*.*/, ''));
    var fi = f.indexOf('*');
    var fk = fi>=0? f.substring(fi+1) : null;
    var a  = (parseFloat(val) || 0) * fn * (fk? parseFloat(dat[fk][i]) || 0 : 1);
    //  a  = parseFloat(a.toExponential((significantDigits(parseFloat(val))||1)-1));
    return round(a);
  }


  function nameSci(str) {
    var bgn = str.lastIndexOf('(');
    if (bgn<0) return '';
    var end = str.lastIndexOf(')');
    var end = end<0? str.length : end;
    var sci = str.substring(bgn+1, end).trim();
    var spc = sci.search(/\s/g);
    return spc>=0 && sci!=='small intestine'? sci : '';
  }

  function nameBas(str) {
    var sci = nameSci(str);
    if (!sci) return str.trim();
    return str.replace(new RegExp(`\\(\\s*${sci}\\s*\\)`), '').trim();
  }

  function readAssetRow(row) {
    var cod = row.code.trim();
    var old = map.has(cod);
    var nam = nameBas(row.name);
    var sci = nameSci(row.name);
    var i   = old? map.get(cod) : map.set(cod, di) && di++;
    dat.code[i] = cod;
    dat.name[i] = old && dat.name[i].length > nam.length? dat.name[i] : nam;
    dat.scie[i] = old && dat.scie[i].length > sci.length? dat.scie[i] : sci;
    dat.lang[i] = (descCorpus.get(cod) || {desc: ''}).desc;
    dat.grup[i] = grupCorpus.get(cod[0]).group;
    dat.regn[i] = parseInt(row.regn.trim(), 10);
    dat.tags[i] = grupCorpus.get(cod[0]).tags.trim();
    for (var k in row) {
      if (BASE.includes(k)) continue;
      var val = row[k].trim().split('±');
      var kt  = renames.get(k) || k;
      if (!dat[kt]) { dat[kt] = []; dat[kt+'_e'] = []; }
      dat[kt][i]      = valParse(val[0]||'0', k, dat, i);
      dat[kt+'_e'][i] = valParse(val[1]||'0', k, dat, i);
    }
  }

  function readAsset(pth) {
    return new Promise(resolve => {
      var stream = fs.createReadStream(pth).pipe(csv.parse({columns: true, comment: '#'}));
      stream.on('data', readAssetRow);
      stream.on('end', () => resolve());
    });
  }


  function nullToZero(d) {
    var K = Object.keys(d);
    for (var k of K) {
      for (var i=0; i<di; i++)
        d[k][i] = d[k][i]!=null? d[k][i] : 0;
    }
  }

  function sumColumns(d, i, ks) {
    var a = 0;
    for (var k of ks)
      a += d[k][i];
    return a;
  }

  function sumAll(d) {
    for (var [k, exp] of sums) {
      d[k] = d[k] || [];
      var sumk = exp.replace(/\s/g, '').split('+');
      for (var i=0; i<di; i++)
        d[k][i] = d[k][i] || round(sumColumns(d, i, sumk));
    }
  }

  function orderAll(d) {
    var a = {};
    for (var k in d) {
      if (k in a) continue;
      for (var ak of orders.get(k) || []) {
        a[ak]   = d[ak];
        var ake = ak+'_e';
        if (ake in d) a[ake] = d[ake];
      }
      a[k] = d[k];
    }
    return a;
  }


  async function main() {
    await columns.load();
    grupCorpus = await groups.load();
    descCorpus = await descriptions.load();
    factors = await readCsv('configs/factors.csv', (acc, r) => acc.set(r.code, r.factor),     new Map());
    renames = await readCsv('configs/renames.csv', (acc, r) => acc.set(r.code, r.actual),     new Map());
    sums    = await readCsv('configs/sums.csv',    (acc, r) => acc.set(r.code, r.expression), new Map());
    orders  = await readCsv('configs/orders.csv',  (acc, r) => {
      var arr = acc.get(r.before) || [];
      acc.set(r.before, arr);
      arr.push(r.code);
    }, new Map());
    for (var file of fs.readdirSync('assets'))
      await readAsset(path.join('assets', file));
    nullToZero(dat);
    sumAll(dat);
    dat = orderAll(dat);
    var ks = Object.keys(dat);
    var a  = ks.map(k => `"${columns(k.replace(/_e$/, ''))[0].name}; ${k}"`).join() + os.EOL;
    for (var i=0; i<di; i++) {
      for (var k of ks) {
        var v = dat[k][i];
        a += JSON.stringify(v==null? 0:v) + ',';
      }
      a = a.substring(0, a.length-1) + os.EOL;
    }
    fs.writeFileSync('index.csv', a);
  }
  await main();
}




// Publish a root package to NPM, GitHub.
function publishRootPackage(ver) {
  var _package = build.readDocument('package.json');
  var m = build.readMetadata('.');
  m.version = ver;
  build.writeMetadata('.', m);
  build.publish('.');
  try { build.publishGithub('.', owner); }
  catch {}
  build.writeDocument(_package);
}


// Publish root, sub packages to NPM, GitHub.
async function publishPackages() {
  var m   = build.readMetadata('.');
  var ver = build.nextUnpublishedVersion(m.name, m.version);
  await generateIndexCsv();
  publishRootPackage(ver);
}


// Publish docs.
function publishDocs() {
  var m = build.readMetadata('.');
  build.updateGithubRepoDetails({owner, repo, topics: m.keywords});
}


// Finally.
async function main(a) {
  if (a[2]==='publish-docs') publishDocs();
  else if (a[2]==='publish-packages') await publishPackages();
  else await generateIndexCsv();
}
main(process.argv);
