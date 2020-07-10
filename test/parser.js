const fs = require("fs");
const { assert } = require('chai');
const WebVTTParser = require("../parser.js").WebVTTParser;
const WebVTTSerializer = require("../parser.js").WebVTTSerializer;

// Adapting test_harness.js into chai asserts
function assert_equals (a, b, c) {
  return assert.equal(a, b, c);
}

function assert_true (a, b) {
  return assert(a, b);
}

function assert_false (a, b) {
  return assert.isFalse(a, b);
}


let parser ,seri;
describe("Tests the parser", () => {
  before(() => {
    parser = new WebVTTParser();
    seri = new WebVTTSerializer();
  });
  const dir = 'test/wpt-file-parsing/';
  const files = fs.readdirSync(dir);
  for(let path of files.filter(p => p.match(/\.vtt$/)))  {
    const vtt = fs.readFileSync(dir + path, 'utf-8');
    it("matches the expected assertions for " + path, () => {
      const js = fs.readFileSync(dir + path.replace(/\.vtt$/, '.js'), 'utf-8');
      const res = parser.parse(vtt);
      var cues = res.cues.map(c => Object.assign({}, c, {
        // WPT model that exposes "vertical" as a field
        vertical: c.direction === 'horizontal' ? '' : c.direction,
        // WPT exposes alignment as align
        align: c.alignment,
        // WPT exposes linePosition as line
        line: c.linePosition,
        // WPT exposes textPosition as position
        position: c.textPosition
      }));
      eval(js);
    });
    it("can parse the serialized version of the parsed tree from " + path, () => {
      const cues = parser.parse(vtt).cues.filter(c => !c.nonSerializable);
      const revtt = seri.serialize(cues);
      const {cues: recues, errors} = parser.parse(revtt);
      assert.deepEqual(recues, cues);
    });
  }
});


