WebVTT parser and validator
===========================

Relevant links:

* [Live WebVTT Validator](http://quuz.org/webvtt/).
* [WebVTT Standard](http://dev.w3.org/html5/webvtt/)

## Install

You can simply load the `parser.js` file into your HTML page and the API will become available on
`window`. Alternatively you can install it using bower (`webvtt`) or npm (`webvtt-parser`).

## API

This module exports classes to either through `window` or `require()`/`import`; the ones you are
likely to need are `WebVTTParser` and `WebVTTSerializer`.

To parse a WebVTT string:

```js
import { WebVTTParser } from 'webvtt-parser';
const parser = new WebVTTParser();
const tree = parser.parse(someVTT, 'metadata');
```

To serialize a WebVTT tree to string:

```js
import { WebVTTSerializer } from 'webvtt-parser';
const seri = new WebVTTSerializer();
const tree = seri.serialize(vttTree.cues)
```
