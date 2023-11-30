WebVTT parser and validator
===========================
## Whats changed from original:
1) package.json:
   added "type": "module"
2) parser.js:
   Instead of "exportify(object)" used "return { WebVTTParser, WebVTTCueTimingsAndSettingsParser, WebVTTCueTextParser, WebVTTSerializer }" which exported in ESM syntax
3) You can use it the same as original repo.
   
Relevant links:

* [Live WebVTT Validator](http://quuz.org/webvtt/).
* [WebVTT Specification](https://w3c.github.io/webvtt/)

## Install

Place parser.js to your project
Then import in ESM

## API

To parse a WebVTT string:

```js
import { WebVTTParser } from '<path-webvtt-parser>/parser.js';
const parser = new WebVTTParser();
const tree = parser.parse(someVTT, 'metadata');
```

By default, the WebVTT parser only recognizes a small subset of named character entities. If you want the full spec-compliant behavior, pass the content of [[html-entities.json]] to the `WebVTTParser()` constructor.

To serialize a WebVTT tree to string:

```js
import { WebVTTSerializer } from '<path-webvtt-parser>/parser.js';
const seri = new WebVTTSerializer();
const tree = seri.serialize(vttTree.cues)
```
