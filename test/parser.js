const fs = require("fs");
const { assert } = require('chai');
const WebVTTParser = require("../parser.js").WebVTTParser;

// Adapting test_harness.js into chai asserts
function assert_equals (a, b, c) {
  return assert.equal(a, b, c);
}

function assert_true (a, b) {
  return assert(a, b);
}


let parser;
describe("Tests the parser", () => {
  before(() => {
    parser = new WebVTTParser();
  });
  const dir = 'test/wpt-file-parsing/';
  const files = fs.readdirSync(dir);
  for(let path of files.filter(p => p.match(/\.vtt$/)))  {
    const vtt = fs.readFileSync(dir + path, 'utf-8');
    it("matches the expected assertions for " + path, () => {
      const js = fs.readFileSync(dir + path.replace(/\.vtt$/, '.js'), 'utf-8');
      const res = parser.parse(vtt);
      var cues = res.cues.map(c => Object.assign({}, c, {vertical: c.direction === 'horizontal' ? '' : c.direction}));
      eval(js);
    });
  }
});
