const csv = require('csv');
const path = require('path');
const fs = require('fs');
const os = require('os');

function round(val) {
  return Math.round(val*1e+12)/1e+12;
};

function readFactors() {
  var map = new Map();
  return new Promise((fres) => {
    var stream = fs.createReadStream('factors.csv').pipe(csv.parse({columns: true, comment: '#'}));
    stream.on('data', (r) => map.set(r.code, r.factor));
    stream.on('end', () => fres(map));
  });
};

function readColumns() {
  var map = new Map();
  return new Promise((fres) => {
    var stream = fs.createReadStream('columns.csv').pipe(csv.parse({columns: true, comment: '#'}));
    stream.on('data', (r) => map.set(r.code, r.actual));
    stream.on('end', () => fres(map));
  });
};

var dat = {
  code: [],
  name: [],
  scie: [],
  regn: []
};
var di = 0;
var map = new Map();
var factors = new Map();
var columns = new Map();

function valParse(val, code) {
  var z = (parseFloat(val)||0)*factors.get(code);
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

function csvReadRow(row) {
  var cod = row.code.trim();
  var old = map.has(cod);
  var nam = nameBas(row.name);
  var sci = nameSci(row.name);
  var i = old? map.get(cod):map.set(cod, di)&&di++;
  dat.code[i] = cod;
  dat.name[i] = old && dat.name[i].length>nam.length? dat.name[i]:nam;
  dat.scie[i] = old && dat.scie[i].length>sci.length? dat.scie[i]:sci;
  dat.regn[i] = parseInt(row.regn.trim(), 10);
  for(var k in row) {
    if(k==='code' || k==='name' || k==='scie' || k==='regn') continue;
    var val = row[k].trim().split('±'), kt = columns.get(k)||k;
    if(!dat[kt]) { dat[kt] = []; dat[kt+'_e'] = []; }
    dat[kt][i] = valParse(val[0]||'0', k);
    dat[kt+'_e'][i] = valParse(val[1]||'0', k);
  }
};

function csvRead(pth) {
  return new Promise((fres) => {
    var stm = fs.createReadStream(pth).pipe(csv.parse({columns: true, comment: '#'}));
    stm.on('data', csvReadRow);
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

function combinedColumns(d) {
  d.vitb = []; d.vitb_e = []; d.vitd = []; d.vitd_e = []; d.tocph = []; d.tocph_e = [];
  d.toctr = []; d.toctr_e = []; d.vitk = []; d.vitk_e = [];
  d.amiace = []; d.amiace_e = []; d.amiacce = []; d.amiacce_e = []; d.amiacne = []; d.amiacne_e = [];
  d.amiac = []; d.amiac_e = []; d.orgac = []; d.orgac_e = [];
  d.fauns = []; d.fauns_e = []; d.faess = []; d.faess_e = []; d.facn3 = []; d.facn3_e = [];
  d.facn6 = []; d.facn6_e = []; d.facn9 = []; d.facn9_e = []; d.famscis = []; d.famscis_e = [];
  d.fatrn = []; d.fatrn_e = [];
  d.olsac = []; d.olsac_e = []; d.phystr = []; d.phystr_e = []; d.mnrleq = []; d.mnrleq_e = [];
  d.mnrlet = []; d.mnrlet_e = []; d.mnrlpet = []; d.mnrlpet_e = []; d.mnrlnet = []; d.mnrlnet_e = [];
  d.mnrltx = []; d.mnrltx_e = [];
  d.carot = []; d.carot_e = []; d.xantp = []; d.xantp_e = []; d.cartbeq = []; d.cartbeq_e = [];
  d.vita = []; d.vita_e = []; d.vit = []; d.vit_e = [];
  for(var i=0; i<di; i++) {
    d.vitb[i] = round(d.thia[i]+d.ribf[i]+d.nia[i]+d.pantac[i]+d.vitb6c[i]+d.biot[i]+d.folsum[i]);
    d.vitb_e[i] = round(d.thia_e[i]+d.ribf_e[i]+d.nia_e[i]+d.pantac_e[i]+d.vitb6c_e[i]+d.biot_e[i]+d.folsum_e[i]);
    d.vitd[i] = round(d.ergcal[i]+d.chocal[i]+d.doh25[i]);
    d.vitd_e[i] = round(d.ergcal_e[i]+d.chocal_e[i]+d.doh25_e[i]);
    d.tocph[i] = round(d.tocpha[i]+d.tocphb[i]+d.tocphg[i]+d.tocphd[i]);
    d.tocph_e[i] = round(d.tocpha_e[i]+d.tocphb_e[i]+d.tocphg_e[i]+d.tocphd_e[i]);
    d.toctr[i] = round(d.toctra[i]+d.toctrb[i]+d.toctrg[i]+d.toctrd[i]);
    d.toctr_e[i] = round(d.toctra_e[i]+d.toctrb_e[i]+d.toctrg_e[i]+d.toctrd_e[i]);
    d.vitk[i] = round(d.vitk1[i]+d.vitk2[i]);
    d.vitk_e[i] = round(d.vitk1_e[i]+d.vitk2_e[i]);
    d.amiace[i] = round(d.his[i]+d.ile[i]+d.leu[i]+d.lys[i]+d.met[i]+d.phe[i]+d.thr[i]+d.trp[i]+d.val[i]);
    d.amiace_e[i] = round(d.his_e[i]+d.ile_e[i]+d.leu_e[i]+d.lys_e[i]+d.met_e[i]+d.phe_e[i]+d.thr_e[i]+d.trp_e[i]+d.val_e[i]);
    d.amiacce[i] = round(d.arg[i]+d.cys[i]+d.gly[i]+d.pro[i]+d.tyr[i]);
    d.amiacce_e[i] = round(d.arg_e[i]+d.cys_e[i]+d.gly_e[i]+d.pro_e[i]+d.tyr_e[i]);
    d.amiacne[i] = round(d.ala[i]+d.asp[i]+d.glu[i]+d.ser[i]);
    d.amiacne_e[i] = round(d.ala_e[i]+d.asp_e[i]+d.glu_e[i]+d.ser_e[i]);
    d.amiac[i] = round(d.amiace[i]+d.amiacce[i]+d.amiacne[i]);
    d.amiac_e[i] = round(d.amiace_e[i]+d.amiacce_e[i]+d.amiacne_e[i]);
    d.orgac[i] = round(d.oxalt[i]+d.caconac[i]+d.citac[i]+d.fumac[i]+d.malac[i]+d.quinac[i]+d.sucac[i]+d.tarac[i]);
    d.orgac_e[i] = round(d.oxalt_e[i]+d.caconac_e[i]+d.citac_e[i]+d.fumac_e[i]+d.malac_e[i]+d.quinac_e[i]+d.sucac_e[i]+d.tarac_e[i]);
    d.fauns[i] = round(d.fams[i]+d.fapu[i]);
    d.fauns_e[i] = round(d.fams_e[i]+d.fapu_e[i]);
    d.faess[i] = round(d.f18d3n3[i]+d.f18d2cn6[i]+d.f20d5n3[i]+d.f22d6n3[i]+d.f20d4n6[i]);
    d.faess_e[i] = round(d.f18d3n3_e[i]+d.f18d2cn6_e[i]+d.f20d5n3_e[i]+d.f22d6n3_e[i]+d.f20d4n6_e[i]);
    d.facn3[i] = round(d.f18d3n3[i]+d.f20d5n3[i]+d.f22d5n3[i]+d.f22d6n3[i]);
    d.facn3_e[i] = round(d.f18d3n3_e[i]+d.f20d5n3_e[i]+d.f22d5n3_e[i]+d.f22d6n3_e[i]);
    d.facn6[i] = round(d.f18d2cn6[i]+d.f20d2n6[i]+d.f22d2n6[i]+d.f20d3n6[i]+d.f20d4n6[i]);
    d.facn6_e[i] = round(d.f18d2cn6_e[i]+d.f20d2n6_e[i]+d.f22d2n6_e[i]+d.f20d3n6_e[i]+d.f20d4n6_e[i]);
    d.facn9[i] = round(d.f18d1cn9[i]+d.f20d1cn9[i]+d.f22d1cn9[i]+d.f24d1cn9[i]);
    d.facn9_e[i] = round(d.f18d1cn9_e[i]+d.f20d1cn9_e[i]+d.f22d1cn9_e[i]+d.f24d1cn9_e[i]);
    d.famscis[i] = round(d.f14d1cn5[i]+d.f16d1cn7[i]+d.f18d1cn9[i]+d.f20d1cn9[i]+d.f22d1cn9[i]+d.f24d1cn9[i]);
    d.famscis_e[i] = round(d.f14d1cn5_e[i]+d.f16d1cn7_e[i]+d.f18d1cn9_e[i]+d.f20d1cn9_e[i]+d.f22d1cn9_e[i]+d.f24d1cn9_e[i]);
    d.fatrn[i] = round(d.f18d1tn9[i]);
    d.fatrn_e[i] = round(d.f18d1tn9_e[i]);
    d.olsac[i] = round(d.rafs[i]+d.stas[i]+d.vers[i]+d.ajgs[i]);
    d.olsac_e[i] = round(d.rafs_e[i]+d.stas_e[i]+d.vers_e[i]+d.ajgs_e[i]);
    d.phystr[i] = round(d.camt[i]+d.stgstr[i]+d.stostrb[i]);
    d.phystr_e[i] = round(d.camt_e[i]+d.stgstr_e[i]+d.stostrb_e[i]);
    d.mnrleq[i] = round(d.na[i]+d.mg[i]+d.k[i]+d.ca[i]+d.p[i]);
    d.mnrleq_e[i] = round(d.na_e[i]+d.mg_e[i]+d.k_e[i]+d.ca_e[i]+d.p_e[i]);
    d.mnrlet[i] = round(d.cr[i]+d.mo[i]+d.mn[i]+d.fe[i]+d.co[i]+d.ni[i]+d.cu[i]+d.zn[i]+d.as[i]+d.se[i]);
    d.mnrlet_e[i] = round(d.cr_e[i]+d.mo_e[i]+d.mn_e[i]+d.fe_e[i]+d.co_e[i]+d.ni_e[i]+d.cu_e[i]+d.zn_e[i]+d.as_e[i]+d.se_e[i]);
    d.mnrlpet[i] = round(d.li[i]);
    d.mnrlpet_e[i] = round(d.li_e[i]);
    d.mnrlnet[i] = round(d.al[i]+d.cd[i]+d.pb[i]);
    d.mnrlnet_e[i] = round(d.al_e[i]+d.cd_e[i]+d.pb_e[i]);
    d.mnrltx[i] = round(d.hg[i]);
    d.mnrltx_e[i] = round(d.hg_e[i]);
    d.carot[i] = round(d.lycpn[i]+d.cartg[i]+d.carta[i]+d.cartb[i]);
    d.carot_e[i] = round(d.lycpn_e[i]+d.cartg_e[i]+d.carta_e[i]+d.cartb_e[i]);
    d.xantp[i] = round(d.lutn[i]+d.zea[i]+d.crypxb[i]);
    d.xantp_e[i] = round(d.lutn_e[i]+d.zea_e[i]+d.crypxb_e[i]);
    d.cartbeq[i] = round(d.carta[i]+d.cartb[i]+d.cartg[i]+d.crypxb[i]);
    d.cartbeq_e[i] = round(d.carta_e[i]+d.cartb_e[i]+d.cartg_e[i]+d.crypxb_e[i]);
    d.vita[i] = round(d.retol[i]+d.cartbeq[i]);
    d.vita_e[i] = round(d.retol_e[i]+d.cartbeq_e[i]);
    d.vit[i] = round(d.vita[i]+d.vitb[i]+d.vitc[i]+d.vitd[i]+d.vite[i]+d.vitk[i]);
    d.vit_e[i] = round(d.vita_e[i]+d.vitb_e[i]+d.vitc_e[i]+d.vitd_e[i]+d.vite_e[i]+d.vitk_e[i]);
  }
};

async function build() {
  factors = await readFactors();
  columns = await readColumns();
  for(var file of fs.readdirSync('assets'))
    await csvRead(path.join('assets', file));
  nullToZero(dat);
  combinedColumns(dat);
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
