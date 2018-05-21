const parse = require('csv-parse');
const lunr = require('lunr');
const path = require('path');
const fs = require('fs');

var corpus = new Map();
var index = null;
var ready = null;

function csv() {
  return path.join(__dirname, 'index.csv');
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
    this.field('desc');
    this.field('grup');
    for(var r of corpus.values()) {
      var {code, name, scie, desc, grup} = r;
      name = name.replace(/^(\w+),/g, '$1 $1 $1 $1,');
      desc = desc.replace(/^\[.*\]$/g).replace(/ā/g, 'a').replace(/ḍ/g, 'd').replace(/ī/g, 'i');
      desc = desc.replace(/ḷ/g, 'l').replace(/ṃ/g, 'm').replace(/ṇ/g, 'n').replace(/ṅ/g, 'n');
      desc = desc.replace(/\w+\.\s([\w\',\/\(\)\- ]+)[;\.]?/g, '$1').replace(/[,\/\(\)\- ]+/g, ' ');
      this.add({code, name, scie, desc, grup});
    }
  });
};

function load() {
  return ready=ready||loadCorpus().then(setupIndex);
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
compositions.load = load;
compositions.corpus = corpus;
module.exports = compositions;
