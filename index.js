const fs = require('fs');
const path = require('path');
const lunr = require('lunr');
const parse = require('csv-parse');
const esql = require('sql-extra');

const TEXTCOL = new Set(['code', 'name', 'scie', 'lang', 'grup', 'tags']);
var corpus = new Map();
var index = null;
var ready = null;




function csv() {
  return path.join(__dirname, 'index.csv');
}




function tsvector(tab, cols) {
  var {code, name, scie, lang, grup, tags} = cols;
  return `setweight(to_tsvector('english', "code"), '${code}')||`+
  `setweight(to_tsvector('english', left("name", strpos("name", ','))), '${code}')||`+
  `setweight(to_tsvector('english', "name"), '${name}')||`+
  `setweight(to_tsvector('english', "scie"), '${scie}')||`+
  `setweight(to_tsvector('english', ${tab}_lang_tags("lang")), '${lang}')||`+
  `setweight(to_tsvector('english', "grup"), '${grup}')||`+
  `setweight(to_tsvector('english', "tags"), '${tags}')`;
}

function createFunctionLangTags(tab) {
  return `CREATE OR REPLACE FUNCTION "${tab}_lang_tags" (TEXT) RETURNS TEXT AS $$`+
  ` SELECT lower(regexp_replace(regexp_replace(regexp_replace($1, `+
  ` '\\[.*?\\]', '', 'g'), '\\w+\\.\\s([\\w\\'',\\/\\(\\)\\- ]+)[;\\.]?', '\\1', 'g'),`+
  ` '[,\\/\\(\\)\\- ]+', ' ', 'g')) $$`+
  ` LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;\n`;
}

function createTable(tab, cols, opt={}, a='') {
  var pre = ['code', 'name', 'scie', 'lang', 'grup', 'regn', 'tags'];
  a += `CREATE TABLE IF NOT EXISTS "${tab}" (`;
  for(var c of pre) {
    var typ = c==='regn'? 'INT':'TEXT';
    a += ` "${c}" ${typ} NOT NULL,`;
  }
  for(var c in cols) {
    if(pre.includes(c)) continue;
    a += ` "${c}" REAL NOT NULL,`;
  }
  if(opt.pk) a += ` PRIMARY KEY ("code"), `;
  a = a.endsWith(', ')? a.substring(0, a.length-2) : a;
  a += `);\n`;
  return a;
}

function insertIntoBegin(tab, cols, a='') {
  a += `INSERT INTO "${tab}" (`;
  for(var c in cols)
    a += `"${c}", `;
  a = a.endsWith(', ')? a.substring(0, a.length-2) : a;
  a += ') VALUES\n(';
  return a;
}

function insertIntoMid(val, a='') {
  for(var k in val)
    a += `'${val[k]}', `;
  a = a.endsWith(', ')? a.substring(0, a.length-2) : a;
  a += `),\n(`;
  return a;
}

function insertIntoEnd(a='') {
  a = a.endsWith(',\n(')? a.substring(0, a.length-3) : a;
  a += ';\n';
  return a;
}

function sql(tab='compositions', opt={}) {
  var i = -1, cols = null, a = '';
  var opt = Object.assign({pk: 'code', index: true}, opt);
  var tsv = tsvector(tab, {code: 'A', name: 'B', scie: 'B', lang: 'B', grup: 'C', tags: 'C'});
  var stream = fs.createReadStream(csv()).pipe(parse({columns: true, comment: '#'}));
  return new Promise((fres, frej) => {
    stream.on('error', frej);
    stream.on('data', (r) => {
      if(++i===0) { cols = r; a = createTable(tab, cols, opt, a); a = insertIntoBegin(tab, cols, a); }
      a = insertIntoMid(r, a);
    });
    stream.on('end', () => {
      a = insertIntoEnd(a);
      a += createFunctionLangTags(tab);
      a += esql.createView(`${tab}_tsvector`, `SELECT *, ${tsv} AS "tsvector" FROM "${tab}"`);
      a += esql.createIndex(`${tab}_tsvector_idx`, tab, `(${tsv})`, {method: 'GIN'});
      a = esql.setupTable.index(tab, cols, opt, a);
      fres(a);
    });
  });
}




function loadRow(row) {
  var a = {};
  for(var k in row) {
    if(TEXTCOL.has(k)) a[k] = row[k];
    else a[k] = parseFloat(row[k]);
  }
  return a;
}

function loadCorpus() {
  return new Promise((fres) => {
    var s = fs.createReadStream(csv()).pipe(parse({columns: true, comment: '#'}));
    s.on('data', (r) => corpus.set(r.code, loadRow(r)));
    s.on('end', fres);
  });
}

function createIndex() {
  return lunr(function() {
    this.ref('code');
    this.field('code');
    this.field('name');
    this.field('scie');
    this.field('lang');
    this.field('grup');
    this.field('tags');
    for(var r of corpus.values()) {
      var {code, name, scie, lang, grup, tags} = r;
      name = name.replace(/^(\w+),/g, '$1 $1 $1 $1,');
      lang = lang.replace(/\[.*?\]/g, '');
      lang = lang.replace(/\w+\.\s([\w\',\/\(\)\- ]+)[;\.]?/g, '$1');
      lang = lang.replace(/[,\/\(\)\- ]+/g, ' ');
      this.add({code, name, scie, lang, grup, tags});
    }
  });
}

async function load() {
  if (ready) await ready;
  if (index) return corpus;
  ready = loadCorpus();
  await ready;
  index = createIndex();
  return corpus;
}




function matchRate(m) {
  return Object.keys(m.matchData.metadata).length;
}

function compositions(txt) {
  if (!index) { load(); return []; }
  var a = [], txt = txt.replace(/\W/g, ' ');
  var ms = index.search(txt), max = 0;
  for (var m of ms)
    max = Math.max(max, matchRate(m));
  for (var m of ms)
    if (matchRate(m)===max) a.push(corpus.get(m.ref));
  return a;
}
compositions.load = load;
compositions.csv = csv;
compositions.sql = sql;
module.exports = compositions;
