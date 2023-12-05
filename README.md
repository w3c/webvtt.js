Non-official WebVTT parser and validator
===========================
## This is a fork of the original `webvtt-parser` module ver.2.2.0 by Anne van Kesteren. The original author's details can be found in the `contributors` section of `package.json`.

## Whats changed:

### This script is adaptation of original script ver.2.2.0 for using in ESM syntax.

* All logic and work remain the same original.
* Functions moved to classes with arrows methods.
* Added options to the ```cue``` object that are not in the original script: ```startTimeStr```, ```endTimeStr``` and ```timeLine```:
  <br>
  Example of oblect ```cue```:
  ```
  Cue {
    "id": "",
    "startTime": 0,
    "endTime": 5.15,

    "startTimeStr": "00:00:00.000",
    "endTimeStr": "00:00:05.150",
    "timeLine": "00:00:00.000 --> 00:00:05.150",

    "direction": "horizontal",
    "snapToLines": true,
    "linePosition": "auto",
    "lineAlign": "start",
    "textPosition": "auto",
    "positionAlign": "auto",
    "size": 100,
    "alignment": "center",
    "pauseOnExit": false,
    "text": "Lorem ipsum dolor sit amet.",
    "tree": {
      "children": [
        {
          "type": "text",
          "value": "Lorem ipsum dolor sit amet."
        }
      ]
    }
  }
  ```
* Now ```serializeTimestamp``` always return hours with leading zeros (00:00:01.000).
* This version use more modern JS syntax ES6 than in original.
* ```test/parser.js``` moved to ESM ```test/parser.mjs```
* ```./parser.js``` moved to ESM ```./parser.mjs```

<br><hr><br>

Relevant links (Official):

* [Live WebVTT Validator](http://quuz.org/webvtt/)
* [WebVTT Specification](https://w3c.github.io/webvtt/)

## Install

You can load the `parser.mjs` file into your HTML page. Alternatively you can install it using npm (`npm install webvtt-parser-esm`).

### How to load in HTML page:

```
<script type="module">
  import { WebVTTParser, WebVTTSerializer } from './parser.mjs';  // public path to parser.mjs

  /***
  Working with  WebVTTParser, WebVTTSerializer ...
  How to: See API
  ***/
</script>
```

### How to load in NodeJS runtime:

If your project in CommonJS, you need to do something to imports ESM packages into CommonJS.

If downloaded from GitHub:

* For download from GitHub use ```gh repo clone BohdanVovkotrub/webvtt.js``` or ```git clone https://github.com/BohdanVovkotrub/webvtt.js.git``` or download then unzip .zip from url <https://github.com/BohdanVovkotrub/webvtt.js>
* If downloaded package is will your main project folder, or you want to run tests, you must install required packages.
<br>Go to the package folder (where is package.json) and run:
  ```
  npm install
  ```
  * That's will install all the required packages.

  Then:
  ```
  import { WebVTTParser, WebVTTSerializer } from './parser.mjs';  // path to downloaded parser.mjs
  ```

If downloaded by NPM:

* For download by NPM use 
  ```
  npm i webvtt-parser-esm
  ```

  ```
  import { WebVTTParser, WebVTTSerializer } from 'webvtt-parser-esm'; 
  ```


## API

This module exports classes to either through `import`; the ones you are
likely to need are `WebVTTParser` and `WebVTTSerializer`.

To parse a WebVTT string:

```js
import { WebVTTParser, WebVTTSerializer } from 'webvtt-parser-esm'; // ./parser.mjs

const someVTT = `
WEBVTT

00:11.000 --> 00:13.000 vertical:rl
<v Roger Bingham>We are in New York City

00:13.000 --> 00:16.000
<v Roger Bingham>We're actually at the Lucern Hotel, just down the street

00:16.000 --> 00:18.000
<v Roger Bingham>from the American Museum of Natural History

00:18.000 --> 00:20.000
<v Roger Bingham>And with me is Neil deGrasse Tyson

00:20.000 --> 00:22.000
<v Roger Bingham>Astrophysicist, Director of the Hayden Planetarium
`;

const parser = new WebVTTParser();
const parsedVtt = parser.parse(someVTT, 'metadata');
```

By default, the WebVTT parser only recognizes a small subset of named character entities. If you want the full spec-compliant behavior, pass the content of [[html-entities.json]] to the `WebVTTParser()` constructor.

To serialize a WebVTT tree to string:

```js
import { WebVTTParser, WebVTTSerializer } from 'webvtt-parser-esm'; // ./parser.mjs
const seri = new WebVTTSerializer();
const serializedVtt = seri.serialize(parsedVtt.cues);

// NOTE: In serialization the parameter tree of every Cue is used, not text!
```


## Tests

After download this pakage you can run test before using to make sure everything is working.

For to do it go to the package folder (where is package.json) and run:

```
npm run test
```

* You must install required packages before do it with ```npm install```

After successfull testing you will see: ```70 passing (90ms)```

<hr>

## # parser.html example

***parser.html*** - it's official example to usage this package, but is imported in ESM syntax.

You can open ```parser.html``` in your WebBrowser.
To do it you need to run this folder over HTTP webserver.
For example to running simple HTTP server on this folder you can run
(installed Python required):
```
python -m http.server 8080
```
Open http://localhost:8080/parser.html