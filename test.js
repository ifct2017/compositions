const assert = require('assert');
const compositions = require('./');




async function testAll() {
  await compositions.load();

  var a = compositions('pineapple');
  var b = compositions('ananas comosus');
  assert.deepStrictEqual(a[0].code, 'E053');
  assert.deepStrictEqual(b[0].code, 'E053');

  var a = compositions('tell me about cow milk.');
  var b = compositions('gai ka doodh details.');
  assert.deepStrictEqual(a[0].code, 'L002');
  assert.deepStrictEqual(b[0].code, 'L002');
}
testAll();
