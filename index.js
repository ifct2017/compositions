const Sql = require('sql-extra');
const parse = require('csv-parse');
const lunr = require('lunr');
const path = require('path');
const fs = require('fs');

var corpus = new Map();
var index = null;
var ready = null;

function tsvector(tab) {
  return `setweight(to_tsvector('english', "code"), 'A')||`+
  `setweight(to_tsvector('english', left("name", strpos("name", ','))), 'A')||`+
  `setweight(to_tsvector('english', "name"), 'B')||`+
  `setweight(to_tsvector('english', "scie"), 'B')||`+
  `setweight(to_tsvector('english', ${tab}_lang_tags("lang")), 'B')||`+
  `setweight(to_tsvector('english', "grup"), 'C')`;
};

function createFunctionLangTags(tab) {
  return `CREATE OR REPLACE FUNCTION "${tab}_lang_tags" (TEXT) RETURNS TEXT AS $$`+
  ` SELECT lower(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(`+
  ` regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace($1, `+
  ` '^\\[.*\\]$', '', 'g'), 'ḷ', 'l', 'g'),`+
  ` 'ḍ', 'd', 'g'), 'ṇ', 'n', 'g'), 'ṃ', 'm', 'g'),`+
  ` 'ṅ', 'n', 'g'), 'ā', 'a', 'g'), 'ī', 'i', 'g'),`+
  ` '\\w+\\.\\s([\\w\\'',\\/\\(\\)\\- ]+)[;\\.]?', '\\1', 'g'),`+
  ` '[,\\/\\(\\)\\- ]+', ' ', 'g')) $$`+
  ` LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;\n`;
};

function createTable(tab, cols, z='') {
  var don = ['code', 'name', 'scie', 'lang', 'grup', 'regn'];
  z += `CREATE TABLE IF NOT EXISTS "${tab}" (`;
  for(var col of don) {
    var typ = col==='regn'? 'INT':'TEXT';
    z += ` "${col}" ${typ} NOT NULL,`;
  }
  for(var k in cols) {
    if(don.includes(k)) continue;
    z += ` "${k}" REAL NOT NULL,`;
  }
  z += ` PRIMARY KEY ("code")`+
    `);\n`;
  z += createFunctionLangTags(tab);
  z += Sql.createView(`${tab}_tsvector`, `SELECT *, ${tsvector(tab)} AS "tsvector" FROM "${tab}"`);
  z += Sql.createIndex(`${tab}_tsvector_idx`, tab, `(${tsvector(tab)})`, {method: 'GIN'});
  z = Sql.setupTable.index(tab, cols, {pk: 'code', index: true}, z)
  return z;
};

function insertIntoBegin(tab, cols, z='') {
  z += `INSERT INTO "${tab}" (`;
  for(var col in cols)
    z += `"${col}", `;
  z = z.endsWith(', ')? z.substring(0, z.length-2):z;
  z += ') VALUES\n(';
};

function insertIntoMid(val, z='') {
  for(var k in val)
    z += `'${val[k]}', `;
  z = z.endsWith(', ')? z.substring(0, z.length-2):z;
  z += `),\n(`;
  return z;
};

function insertIntoEnd(z='') {
  z = z.endsWith(',\n(')? z.substring(0, z.length-3):z;
  z += ');\n';
  return z;
};

function csv() {
  return path.join(__dirname, 'index.csv');
};

function sql(tab='compositions', opt={}) {
  var i = -1, cols = null, z = '';
  var stream = fs.createReadStream(csv()).pipe(parse({columns: true, comment: '#'}));
  return new Promise((fres, frej) => {
    stream.on('error', frej);
    stream.on('data', (r) => {
      if(++i===0) { cols = r; z = createTable(tab, cols, z); z = insertIntoBegin(tab, cols, z); }
      z = insertIntoMid(r, z);
    });
    stream.on('end', () => {
      z = insertIntoEnd(z);
      z += createFunctionLangTags(tab);
      z += Sql.createView(`${tab}_tsvector`, `SELECT *, ${tsvector(tab)} AS "tsvector" FROM "${tab}"`);
      z += Sql.createIndex(`${tab}_tsvector_idx`, tab, `(${tsvector(tab)})`, {method: 'GIN'});
      z = Sql.setupTable.index(tab, cols, {pk: 'code', index: true}, z);
      fres(z);
    });
  });
};

function loadCorpus() {
  return new Promise((fres) => {
    var stream = fs.createReadStream(csv()).pipe(parse({columns: true, comment: '#'}));
    stream.on('data', (r) => corpus.set(r.code, r));
    stream.on('end', fres);
  });
};

function setupIndex() {
  index = lunr(function() {
    this.ref('code');
    this.field('code');
    this.field('name');
    this.field('scie');
    this.field('lang');
    this.field('grup');
    for(var r of corpus.values()) {
      var {code, name, scie, lang, grup} = r;
      name = name.replace(/^(\w+),/g, '$1 $1 $1 $1,');
      lang = lang.replace(/^\[.*\]$/g).replace(/ā/g, 'a').replace(/ḍ/g, 'd').replace(/ī/g, 'i');
      lang = lang.replace(/ḷ/g, 'l').replace(/ṃ/g, 'm').replace(/ṇ/g, 'n').replace(/ṅ/g, 'n');
      lang = lang.replace(/\w+\.\s([\w\',\/\(\)\- ]+)[;\.]?/g, '$1').replace(/[,\/\(\)\- ]+/g, ' ');
      this.add({code, name, scie, lang, grup});
    }
  });
};

function load() {
  ready = ready||loadCorpus();
  return ready.then(setupIndex);
};

function compositions(txt) {
  if(index==null) return [];
  var z = [], txt = txt.replace(/\W/g, ' ');
  var mats = index.search(txt), max = 0;
  for(var mat of mats)
    max = Math.max(max, Object.keys(mat.matchData.metadata).length);
  for(var mat of mats)
    if(Object.keys(mat.matchData.metadata).length===max) z.push(corpus.get(mat.ref));
  return z;
};
compositions.csv = csv;
compositions.sql = sql;
compositions.load = load;
compositions.corpus = corpus;
module.exports = compositions;
