const fs = require("fs");
const { assert } = require('chai');
const WebVTTParser = require("../parser.js").WebVTTParser;
const WebVTTSerializer = require("../parser.js").WebVTTSerializer;
const entities = require("../html-entities.json");

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
describe("Tests the file parser", () => {
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

const removeEnclosingChar = str => str.slice(1,str.length - 1)

const removeParent = tree => {
  if (tree.children) {
    tree.children = tree.children.map(removeParent);
  }
  delete tree.parent;
  return tree;
}

// The WPT test suite generates a text format to describe the expected
// structure of the parsed cue
// The next few functions are used to parse that format into
// the parser output
function parseStringIntoCueTree(lines) {
  const tree = {children: [], parent:null};
  let curTree = tree;
  let indent = 0;
  lines.slice(1).split("\n|").map(l => l.trimEnd()).filter(l => l).forEach(l => {
    let ret = parseLineIntoCueTree(l, curTree, indent);
    if (ret && ret.children) {
      curTree = ret;
      indent++;
    } else  if (!ret) {
      while(!ret) {
        if (indent <= 0) {
          assert(false, "Could not parse " + lines + " as a cue tree");
          break;
        }
        let parent = curTree.parent;
        curTree = parent
        indent--;
        ret = parseLineIntoCueTree(l, curTree, indent);
      }
    }
  });
  return removeParent(tree);
}


function parseTimestamp(ts) {
  const timestampRegex = new RegExp("^([0-9]+:)?([0-5][0-9]:)([0-5][0-9])(\.[0-9]{3})$");
  let [,h ,m ,s , ms] = ts.match(timestampRegex).map(s => s ? parseInt(s.replace(/[:\.]/, ''), 10) : s);
  return (h || 0)*3600 + (m || 0)*60 + (s || 0) + (ms || 0) / 1000;
}

function parseLineIntoCueTree(line, tree, indent = 0) {
  if (line.slice(0, indent*2 + 1) !== " ".repeat(indent*2 +1)) return false;
  line = line.slice(indent*2 + 1);
  switch(line[0]) {
  case '"':
    tree.children.push({"type": "text", "value": removeEnclosingChar(line)});
    return true;
  case '<':
    if (line[1] === "?") {
      tree.children.push({"type": "timestamp", value: parseTimestamp(removeEnclosingChar(line).split(" ")[1])});
      return true;
    } else {
      let name = removeEnclosingChar(line);
      if (name === "span") {
        name = "c";
      }
      const newTree ={"type": "object", name, children: [], classes:[], parent: tree};
      tree.children.push(newTree);
      return newTree;
    }
  case 'l':
    tree.name = "lang";
    tree.value = removeEnclosingChar(line.split("=")[1]);
    return true;
  case 'c':
    tree.classes = removeEnclosingChar(line.split("=")[1]).split(/\s/);
    return true;
  case 't':
    if (tree.name === "c") tree.name = "v";
    tree.value = removeEnclosingChar(line.split("=")[1]);
    return true;
  default:
    assert(false, "not matching " + line + " to a well-known child")
  }
}

function mergeAdjacentTextNodes(tree) {
  if (tree.children) {
    tree.children = tree.children.reduce((acc, b) => {
      if (acc.length > 0 && b.type === "text" && acc[acc.length -1].type === "text") {
        acc[acc.length - 1].value += b.value;
      } else {
        acc.push(b);
      }
      return acc;
    }, []);
    tree.children = tree.children.map(mergeAdjacentTextNodes);
  }
  return tree;
}

describe("Tests the cue parser", () => {
  before(() => {
    parser = new WebVTTParser(entities);
    seri = new WebVTTSerializer();
  });
  const dir = 'test/wpt-cue-parsing/';
  const files = fs.readdirSync(dir);
  for(let path of files.filter(p => p.match(/\.vtt$/)))  {
    const vtt = fs.readFileSync(dir + path, 'utf-8');
    it("matches the expected DOM tree for " + path, () => {
      const expected = JSON.parse(fs.readFileSync(dir + path.replace(/\.vtt/, '.json'), 'utf-8'));
      const res = parser.parse(vtt);
      res.cues.forEach((cue, i) => {
        assert.deepEqual(cue.tree, parseStringIntoCueTree(expected[i].expectedTree), "parsing cue " + expected[i].text.trim() + " gives the expected result");
      });
    });
    it("can parse the serialized version of the parsed cue tree from " + path, () => {
      const cues = parser.parse(vtt).cues.map(
        // in re-parsing, adjancent text nodes get merged
        // which we don't want to flag as a meaning full difference
        c => Object.assign({}, c, {tree: mergeAdjacentTextNodes(c.tree)})
      );
      const revtt = seri.serialize(cues);
      const {cues: recues, errors} = parser.parse(revtt);
      // Given that the initial text is not canonicalized, we ignore it here
      cues.forEach((cue, i) => {
        if (i === 4)
          console.log(JSON.stringify(cue.tree, null, 2), JSON.stringify(recues[i].tree, null, 2), path)
        assert.deepEqual(cue.tree, recues[i].tree, "serializing cue " + cue.text + " (#" + i + ") gives the expected result");
      });
    });
  }

});


