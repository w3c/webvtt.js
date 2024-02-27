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

let parser, seri;
describe("Tests the file parser", () => {
  before(() => {
    parser = new WebVTTParser();
    seri = new WebVTTSerializer();
  });
  const dir = 'test/wpt-file-parsing/';
  const files = fs.readdirSync(dir);
  for(let path of files.filter(p => p.match(/\.vtt$/)))  {
    // No Support for region syntax yet
    if (path.match(/region/)) continue;
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

describe("Tests the default cue parser with well-formed and lenient versions of the default entities", () => {
  before(() => {
    parser = new WebVTTParser();
  });

  const suffixes = ['', '--'];

  const map = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&lt': '<',
    '&gt': '>',
    '&amp': '&',
  };

  for (const suffix of suffixes) {
    for (const [raw, char] of Object.entries(map)) {
      it(`Parsed ${JSON.stringify(raw)} gives ${JSON.stringify(char)} when followed by suffix ${JSON.stringify(suffix)}`, () => {
        assert.deepEqual(unescape(raw, suffix), char);
      });
    }
  }

  function unescape(raw, suffix) {
    const { value } = parser.parse(
      `WEBVTT\n\n00:00.000 --> 00:01.000\n${raw}${suffix}\n`,
      'metadata',
    ).cues[0].tree.children[0];

    return value.slice(0, value.length - suffix.length);
  }
});

describe("Tests round-tripping parse->serialize->parse of well-formed entities", () => {
  before(() => {
    parser = new WebVTTParser();
    seri = new WebVTTSerializer();
  });

  for (const raw of ['&lt;', '&gt;', '&amp;']) {
    it(`Raw entity ${JSON.stringify(raw)} round-trips to itself`, () => {
      const parsed = parser.parse(`WEBVTT\n\n00:00.000 --> 00:01.000\n${raw}\n`, 'metadata');
      const serialized = seri.serialize(parsed.cues);

      assert.include(serialized, raw);
    });
  }
});

describe("Tests round-tripping serialize->parse->serialize of well-formed entities", () => {
  before(() => {
    parser = new WebVTTParser();
    seri = new WebVTTSerializer();
  });

  for (const char of ['<', '>', '&']) {
    it(`Char ${JSON.stringify(char)} round-trips to itself`, () => {
      const textNode = { type: 'text', value: char };

      const serialized = seri.serialize([
        {
          direction: 'horizontal',
          snapToLines: true,
          linePosition: 'auto',
          lineAlign: 'start',
          textPosition: 'auto',
          positionAlign: 'auto',
          size: 100,
          alignment: 'center',
          id: '',
          startTime: 0,
          endTime: 1,
          pauseOnExit: false,
          text: '[dummy text]',
          tree: {
            children: [textNode],
          },
        },
      ]);
      const parsed = parser.parse(serialized, 'metadata');
      const roundTripped = parsed.cues[0].tree.children[0];

      assert.deepEqual(roundTripped, textNode);
    });
  }
});

describe("https://github.com/w3c/webvtt.js/issues/36", () => {
  before(() => {
    parser = new WebVTTParser({
      "&amp": "&",
      "&amp;": "&",
      "&AMP;": "&",
      "&AMP": "&",
    });
  });

  const texts = [
    { raw: 'Texas A&amp;M', expect: 'Texas A&M' },
    { raw: 'Texas A&amp', expect: 'Texas A&' },
    { raw: 'Texas A&ampM', expect: 'Texas A&M' },
  ];

  for (const { raw, expect } of texts) {
    it(raw, () => {
      const text = `WEBVTT\n\n1\n00:11:46.140 --> 00:11:48.380\n${raw}`;
      const parsed = parser.parse(text, "metadata");
      assert.deepEqual(parsed.cues[0].tree.children[0].value, expect);
    });
  }
});
