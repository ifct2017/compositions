const Sql = require('sql-extra');
const parse = require('csv-parse');
const lunr = require('lunr');
const path = require('path');
const fs = require('fs');

const TEXTCOL = new Set(['code', 'name', 'scie', 'lang', 'grup', 'tags']);
var corpus = new Map();
var index = null;
var ready = null;

function tsvector(tab, cols) {
  return `setweight(to_tsvector('english', "code"), '${cols.code||'A'}')||`+
  `setweight(to_tsvector('english', left("name", strpos("name", ','))), '${cols.code||'A'}')||`+
  `setweight(to_tsvector('english', "name"), '${cols.name||'B'}')||`+
  `setweight(to_tsvector('english', "scie"), '${cols.scie||'B'}')||`+
  `setweight(to_tsvector('english', ${tab}_lang_tags("lang")), '${cols.lang||'B'}')||`+
  `setweight(to_tsvector('english', "grup"), '${cols.grup||'C'}')||`+
  `setweight(to_tsvector('english', "tags"), '${cols.tags||'C'}')`;
};

function createFunctionLangTags(tab) {
  return `CREATE OR REPLACE FUNCTION "${tab}_lang_tags" (TEXT) RETURNS TEXT AS $$`+
  ` SELECT lower(regexp_replace(regexp_replace(regexp_replace($1, `+
  ` '\\[.*?\\]', '', 'g'), '\\w+\\.\\s([\\w\\'',\\/\\(\\)\\- ]+)[;\\.]?', '\\1', 'g'),`+
  ` '[,\\/\\(\\)\\- ]+', ' ', 'g')) $$`+
  ` LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;\n`;
};

function createTable(tab, cols, opt={}, z='') {
  var don = ['code', 'name', 'scie', 'lang', 'grup', 'regn', 'tags'];
  z += `CREATE TABLE IF NOT EXISTS "${tab}" (`;
  for(var col of don) {
    var typ = col==='regn'? 'INT':'TEXT';
    z += ` "${col}" ${typ} NOT NULL,`;
  }
  for(var k in cols) {
    if(don.includes(k)) continue;
    z += ` "${k}" REAL NOT NULL,`;
  }
  if(opt.pk) z += ` PRIMARY KEY ("code"), `;
  z = z.endsWith(', ')? z.substring(0, z.length-2):z;
  z += `);\n`;
  return z;
};

function insertIntoBegin(tab, cols, z='') {
  z += `INSERT INTO "${tab}" (`;
  for(var col in cols)
    z += `"${col}", `;
  z = z.endsWith(', ')? z.substring(0, z.length-2):z;
  z += ') VALUES\n(';
  return z;
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
  z += ';\n';
  return z;
};

function csv() {
  return path.join(__dirname, 'index.csv');
};

function sql(tab='compositions', opt={}) {
  var i = -1, cols = null, z = '';
  var opt = Object.assign({pk: 'code', index: true}, opt);
  var tsv = tsvector(tab, {code: 'A', name: 'B', scie: 'B', lang: 'B', grup: 'C', tags: 'C'});
  var stream = fs.createReadStream(csv()).pipe(parse({columns: true, comment: '#'}));
  return new Promise((fres, frej) => {
    stream.on('error', frej);
    stream.on('data', (r) => {
      if(++i===0) { cols = r; z = createTable(tab, cols, opt, z); z = insertIntoBegin(tab, cols, z); }
      z = insertIntoMid(r, z);
    });
    stream.on('end', () => {
      z = insertIntoEnd(z);
      z += createFunctionLangTags(tab);
      z += Sql.createView(`${tab}_tsvector`, `SELECT *, ${tsv} AS "tsvector" FROM "${tab}"`);
      z += Sql.createIndex(`${tab}_tsvector_idx`, tab, `(${tsv})`, {method: 'GIN'});
      z = Sql.setupTable.index(tab, cols, opt, z);
      fres(z);
    });
  });
};

function loadRow(row) {
  var z = {};
  for(var k in row) {
    if(TEXTCOL.has(k)) z[k] = row[k];
    else z[k] = parseFloat(row[k]);
  }
  return z;
};

function loadCorpus() {
  return new Promise((fres) => {
    var stream = fs.createReadStream(csv()).pipe(parse({columns: true, comment: '#'}));
    stream.on('data', (r) => corpus.set(r.code, loadRow(r)));
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
