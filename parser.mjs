// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

// Not intended to be fast, but if you can make it faster, please help out!

// This script is adaptation of original script ver.2.2.0 for using in ESM syntax
// Functions moved to classes with arrows methods.

// Please, read README.md before using.

// This version has changes:
// 1) To <cue> object added options: 'startTimeStr', 'endTimeStr' and 'timeLine'
// 2) <serializeTimestamp> always return hours now (with 00:)
// This version use more modern JS syntax ES6 than in original.
// All unit tests is successfuly done (70 of 70).

// Author of original script: "Anne van Kesteren <annevk@annevk.nl>"
// Forked by: "Bohdan Vovkotrub <bvovkotrub@gmail.com>"
// this fork url: "https://github.com/BohdanVovkotrub/webvtt.js"

class RegEx {
  static replaceNullCharacters = (input = '') => { // global search and replace for \0 to \uFFFD (�)
    return input.replace(/\0/g, '\uFFFD');
  };

  static hasTimeSeparator = (inputString = '') => { // input string has timecodes or not
    return inputString.indexOf('-->') != -1;
  };

  static isNonEmptyString = (inputString = '') => {
    return inputString != '' && inputString != undefined;
  };

  static isBOM = (inputSymbol = '') => { // Byte Order Mark ( "Zero Width No-Break Space" )
    return inputSymbol === '\ufeff';
  };

  static isNOTE = (inputString = '') => { // NOTE ...
    return /^NOTE($|[ \t])/.test(inputString);
  };

  static isSTYLE = (inputString = '') => { // STYLE ...
    return /^STYLE($|[ \t])/.test(inputString);
  };

  static isNum = (inputSymbol = '') => { // is any digit
    return /\d/.test(inputSymbol);
  };

  static containsComma = (inputString = '') => {
    return /,/.test(inputString);
  };

  static isNumOrPercent = (inputString = '') => {
    return /^[-\d](\d*)(\.\d+)?%?$/.test(inputString);
  };

  static isPercent = (inputString = '') => {
    return inputString[inputString.length-1] === '%';
  };
};

export class Cue {
  constructor() {
    const defaults = Cue.getDefaultCueSettings();

    this.direction = defaults.direction;
    this.snapToLines = defaults.snapToLines;
    this.linePosition = defaults.linePosition;
    this.lineAlign = defaults.lineAlign;
    this.textPosition = defaults.textPosition;
    this.positionAlign = defaults.positionAlign;
    this.size = defaults.size;
    this.alignment = defaults.alignment;

    this.id = '';
    this.startTime = 0;
    this.endTime = 0;
    this.startTimeStr = '00:00:00.000';
    this.endTimeStr = '00:00:00.000';
    this.timeLine = '00:00:00.000 --> 00:00:00.000';
    this.pauseOnExit = false;
    this.text = '';
    this.tree = null;
  };

  static getDefaultCueSettings = () => {
    return {
      direction: 'horizontal',
      snapToLines: true,
      linePosition: 'auto',
      lineAlign: 'start',
      textPosition: 'auto',
      positionAlign: 'auto',
      size: 100,
      alignment: 'center',
    };
  };
};

export class WebVTTParser {
  constructor(sortByTime = true, entities) {
    if (!entities) {
      entities = {
        "&amp": "&",
        "&lt": "<",
        "&gt": ">",
        "&lrm": "\u200e",
        "&rlm": "\u200f",
        "&nbsp": "\u00A0"
      };
    };
    this.entities = entities;
    this.sortByTime = sortByTime;
  };


  parse = (input, mode) => {
    input = RegEx.replaceNullCharacters(input);
    const NEWLINE = /\r\n|\r|\n/;
    const lines = input.split(NEWLINE);
    const startTime = Date.now();
    let linePos = 0;
    let alreadyCollected = false;
    const styles = [];
    const cues = [];
    const errors = [];
    
    const err = (message, col) => errors.push({ message, line: linePos+1, col});

    const line = lines[linePos];
    const lineLength = line.length;
    const signature = 'WEBVTT';
    let bom = 0;
    let signatureLength = signature.length;

    /* Byte order mark */
    if (RegEx.isBOM(line[0])) {
      bom = 1;
      signatureLength += 1;
    };

    /* SIGNATURE */
    if (
      lineLength < signatureLength ||
      line.indexOf(signature) !== 0+bom ||
      lineLength > signatureLength &&
      line[signatureLength] !== " " &&
      line[signatureLength] !== "\t"
    ) {
      err('No valid signature. (File needs to start with "WEBVTT".)');
    };

    linePos++;
    
    /* HEADER */
    while (lines[linePos] != '' && lines[linePos] != undefined) {
      err('No blank line after the signature.');
      if(lines[linePos].indexOf('-->') != -1) {
        alreadyCollected = true;
        break;
      };
      linePos++;
    };

    /* CUE LOOP */
    while(lines[linePos] != undefined) {
      while(!alreadyCollected && lines[linePos] == '') {
        linePos++;
      };
      if(!alreadyCollected && lines[linePos] == undefined) break;

      let cue = new Cue();
      let parseTimings = true;
      
      if(lines[linePos].indexOf("-->") == -1) {
        cue.id = lines[linePos];
        
        /* COMMENTS
          Not part of the specification's parser as these would just be ignored. However,
          we want them to be conforming and not get "Cue identifier cannot be standalone".
        */
        
        if(RegEx.isNOTE(cue.id)) {
          linePos++;
          while(lines[linePos] != '' && lines[linePos] != undefined) {
            if (lines[linePos].indexOf("-->") != -1) {
              err('Cannot have timestamp in a comment.');
              linePos++;
            };
          };
          continue;
        };
        
        /* STYLES */
        if(RegEx.isSTYLE(cue.id)) {
          const style = [];
          let invalid = false;
          linePos++;
          while(lines[linePos] != '' && lines[linePos] != undefined) {
            if(RegEx.hasTimeSeparator(lines[linePos])) {
              err('Cannot have timestamp in a style block.');
              invalid = true;
            };
            style.push(lines[linePos]);
            linePos++;
          };
          if (cues.length) {
            err('Style blocks cannot appear after the first cue.');
            continue;
          };
          if (!invalid) styles.push(style.join('\n'));
          continue;
        };

        linePos++;

        if(lines[linePos] == "" || lines[linePos] == undefined) {
          err('Cue identifier cannot be standalone.');
          continue;
        };

        if(!RegEx.hasTimeSeparator(lines[linePos])) {
          parseTimings = false;
          err('Cue identifier needs to be followed by timestamp.');
          continue;
        };
      };
      
      /* TIMINGS */
      alreadyCollected = false;
      const timings = new WebVTTCueTimingsAndSettingsParser(lines[linePos], err);
      let previousCueStart = 0;
      if (cues.length > 0) {
        previousCueStart = cues[cues.length-1].startTime;
      };
      if (parseTimings && !timings.parse(cue, previousCueStart)) {
        /* BAD CUE */
        cue = null;
        linePos++;

        /* BAD CUE LOOP */
        while (lines[linePos] != '' && lines[linePos] != undefined) {
          if (RegEx.hasTimeSeparator(lines[linePos])) {
            alreadyCollected = true;
            break;
          };
          linePos++;
        };
        continue;
      };
      linePos++;
      
      /* CUE TEXT LOOP */
      while (RegEx.isNonEmptyString(lines[linePos])) {
        if (RegEx.hasTimeSeparator(lines[linePos])) {
          err('Blank line missing before cue.');
          alreadyCollected = true;
          break;
        };
        if (cue.text != '') cue.text += '\n';
        cue.text += lines[linePos];
        linePos++;
      };

      /* CUE TEXT PROCESSING */
      const cueTextParser = new WebVTTCueTextParser(cue.text, err, mode, this.entities);
      cue.tree = cueTextParser.parse(cue.startTime, cue.endTime);
      cues.push(cue);
    };

    if (this.sortByTime === true) {
      cues.sort((a, b) => {
        if (a.startTime < b.startTime) return -1;
        if (a.startTime > b.startTime) return 1;
        if (a.endTime > b.endTime) return -1;
        if (a.endTime < b.endTime) return 1;
        return 0;
      });
    };
    
    /* END */

    return {
      cues,
      errors,
      time: Date.now() - startTime,
      styles,
    };
  };
};

export class WebVTTCueTimingsAndSettingsParser {
  constructor(line, errorHandler) {
    this.SPACE = /[\u0020\t\f]/;
    this.NOSPACE = /[^\u0020\t\f]/;
    this.line = line;
    this.pos = 0;
    this.errorHandler = errorHandler;
    this.spaceBeforeSetting = true;
  };

  err = (message = '') => {
    this.errorHandler(message, this.pos + 1);
  };

  skip = (pattern) => {
    while (this.line[this.pos] != undefined && pattern.test(this.line[this.pos])) {
      this.pos++;
    };
  };

  collect = (pattern) => {
    let str = '';
    while (this.line[this.pos] != undefined && pattern.test(this.line[this.pos])) {
      str += this.line[this.pos];
      this.pos++;
    };
    return str;
  };

  timestamp = () => {
    let units = 'minutes';
    let val1, val2, val3, val4;
    // 3
    if (this.line[this.pos] === undefined) {
      this.err('No timestamp found.');
      return;
    };
    // 4
    if(!RegEx.isNum(this.line[this.pos])) {
      this.err('Timestamp must start with a character in the range 0-9.');
      return;
    };
    // 5-7
    val1 = this.collect(/\d/);
    if(val1.length > 2 || parseInt(val1, 10) > 59) {
      units = 'hours';
    };
    // 8
    if(this.line[this.pos] != ":") {
      this.err('No time unit separator found.');
      return;
    };
    this.pos++;
    // 9-11
    val2 = this.collect(/\d/);
    if(val2.length != 2) {
      this.err('Must be exactly two digits.');
      return;
    };
    // 12
    if(units == 'hours' || this.line[this.pos] == ":") {
      if(this.line[this.pos] != ":") {
        this.err('No seconds found or minutes is greater than 59.');
        return;
      };
      this.pos++;
      val3 = this.collect(/\d/);
      if(val3.length != 2) {
        this.err('Must be exactly two digits.');
        return;
      };
    } else {
      if (val1.length != 2) {
        this.err('Must be exactly two digits.');
        return;
      };
      val3 = val2;
      val2 = val1;
      val1 = '0';
    };
    // 13
    if (this.line[this.pos] != '.') {
      this.err('No decimal separator (".") found.');
      return;
    };
    this.pos++;
    // 14-16
    val4 = this.collect(/\d/);
    if(val4.length != 3) {
      this.err('Milliseconds must be given in three digits.');
      return;
    };
    // 17
    if (parseInt(val2, 10) > 59) {
      this.err('You cannot have more than 59 minutes.');
      return;
    };
    if (parseInt(val3, 10) > 59) {
      this.err('You cannot have more than 59 seconds.');
      return;
    };

    return (
      parseInt(val1, 10) * 60 * 60 +
      parseInt(val2, 10) * 60 +
      parseInt(val3, 10) +
      parseInt(val4, 10) / 1000
    );
  };

  parseSettings = (input, cue) => {
    const settings = input.split(this.SPACE);
    const seen = [];

    for (let i=0; i < settings.length; i++) {
      if(settings[i] == "") continue;

      const index = settings[i].indexOf(':');
      const setting = settings[i].slice(0, index);
      let value = settings[i].slice(index + 1);

      if (seen.indexOf(setting) != -1) {
        this.err("Duplicate setting.");
      };
      seen.push(setting);

      if (value == '') {
        this.err('No value for setting defined.');
        return;
      };

      let numVal;

      if (setting == 'vertical') { // writing direction
        if(value != "rl" && value != "lr") {
          this.err('Writing direction can only be set to "rl" or "rl".');
          continue;
        };
        cue.direction = value;
      } else if (setting == 'line') { // line position and optionally line alignment
        let lineAlign;
        if (RegEx.containsComma(value)) {
          const comp = value.split(',');
          value = comp[0];
          lineAlign = comp[1];
        };
        if(!RegEx.isNumOrPercent(value)) {
          this.err('Line position takes a number or percentage.');
          continue;
        };
        if(value.indexOf("-", 1) != -1) {
          this.err('Line position can only have "-" at the start.');
          continue;
        };
        if(value.indexOf("%") != -1 && value.indexOf("%") != value.length-1) {
          this.err('Line position can only have "%" at the end.');
          continue;
        };
        if(value[0] == "-" && value[value.length-1] == "%") {
          this.err('Line position cannot be a negative percentage.');
          continue;
        };

        numVal = value;
        let isPercent = false;

        if (value[value.length-1] == '%') {
          isPercent = true;
          numVal = value.slice(0, value.length - 1);
          if (parseInt(value, 10) > 100) {
            this.err('Line position cannot be >100%.');
            continue;
          };
        };
        if (numVal === '' || isNaN(numVal) || !isFinite(numVal)) {
          this.err('Line position needs to be a number.');
          continue;
        };
        if (lineAlign !== undefined) {
          if (!['start', 'center', 'end'].includes(lineAlign)) {
            this.err('Line alignment needs to be one of "start", "center" or "end".');
            continue;
          };
          cue.lineAlign = lineAlign;
        };
        cue.snapToLines = !isPercent;
        cue.linePosition = parseFloat(numVal);
        if (parseFloat(numVal).toString() !== numVal) {
          cue.nonSerializable = true;
        };
      } else if (setting == 'position') { // text position and optional positionAlign
        let positionAlign;
        if (RegEx.containsComma(value)) {
          const comp = value.split(',');
          value = comp[0];
          positionAlign = comp[1];
        };
        if (!RegEx.isPercent(value)) {
          this.err('Text position must be a percentage.');
          continue;
        };
        if (parseInt(value, 10) > 100 || parseInt(value, 10) < 0) {
          this.err('Text position needs to be between 0 and 100%.');
          continue;
        };
        numVal = value.slice(0, value.length-1);
        if (numVal === '' || isNaN(numVal) || !isFinite(numVal)) {
          this.err('Line position needs to be a number.');
          continue;
        };
        if (positionAlign !== undefined) {
          if (!['line-left', 'center', 'line-right'].includes(positionAlign)) {
            this.err('Position alignment needs to be one of "line-left", "center" or "line-right"');
            continue;
          };
          cue.positionAlign = positionAlign;
        };
        cue.textPosition = parseFloat(numVal);
      } else if (setting == 'size') { // size
        if(!RegEx.isPercent(value)) {
          this.err('Size must be a percentage.');
          continue;
        };
        if(parseInt(value, 10) > 100) {
          this.err('Size cannot be >100%.')
          continue;
        };
        let size = value.slice(0, value.length -1);
        if (size === undefined || size === '' || isNaN(size)) {
          this.err('Size needs to be a number');
          size = 100;
          continue;
        } else {
          size = parseFloat(size);
          if (size < 0 || size > 100) {
            this.err('Size needs to be between 0 and 100%.');
            continue;
          };
        };
        cue.size = size; 
      } else if (setting == 'align') { // alignment
        const alignValues = ["start", "center", "end", "left", "right"];
        if (alignValues.indexOf(value) == -1) {
          this.err(`Alignment can only be set to one of ${alignValues.join(", ")}.`);
          continue;
        };
        cue.alignment = value;
      } else {
        this.err('Invalid setting.');
      };
    };
  };

  parse = (cue, previousCueStart) => {
    this.skip(this.SPACE);
    cue.startTime = this.timestamp();
    if (cue.startTime == undefined) return;
    if(cue.startTime < previousCueStart) {
      this.err('Start timestamp is not greater than or equal to start timestamp of previous cue.');
    };
    cue.startTimeStr = new WebVTTSerializer().serializeTimestamp(cue.startTime);
    if (this.NOSPACE.test(this.line[this.pos])) {
      this.err('Timestamp not separated from "-->" by whitespace.');
    };
    this.skip(this.SPACE);
    // 6-8
    if (this.line[this.pos] != '-') {
      this.err('No valid timestamp separator found.');
      return;
    };
    this.pos++;
    if (this.line[this.pos] != '-') {
      this.err('No valid timestamp separator found.');
      return;
    };
    this.pos++;
    if (this.line[this.pos] != '>') {
      this.err('No valid timestamp separator found.');
      return;
    };
    this.pos++;
    if (this.NOSPACE.test(this.line[this.pos])) {
      this.err('"-->" not separated from timestamp by whitespace.');
    };
    this.skip(this.SPACE);
    cue.endTime = this.timestamp();
    if (cue.endTime === undefined) return;
    if (cue.startTime >= cue.endTime) {
      this.err('End timestamp is not greater than start timestamp.');
    };
    cue.endTimeStr = new WebVTTSerializer().serializeTimestamp(cue.endTime);
    if (this.NOSPACE.test(this.line[this.pos])) {
      this.spaceBeforeSetting = false;
    };
    cue.timeLine = `${cue.startTimeStr} --> ${cue.endTimeStr}`;
    this.skip(this.SPACE);
    this.parseSettings(this.line.substring(this.pos), cue);
    return true;
  };

  parseTimestamp = () => {
    const timestamp = this.timestamp();
    if (this.line[this.pos] != undefined) {
      this.err('Timestamp must not have trailing characters.');
      return;
    };
    return timestamp;
  };
};

export class WebVTTCueTextParser {
  constructor(line, errorHandler, mode, entities) {
    this.line = line;
    this.errorHandler = errorHandler;
    this.mode = mode;
    this.entities = entities;
    this.pos = 0;
  };

  err = (message = '') => {
    if (this.mode === 'metadata') return;
    this.errorHandler(message, this.pos + 1);
  };

  parse = (cueStart, cueEnd) => {   
    const removeCycles = (tree) => {
      const cyclelessTree = {...tree};
      if (tree.children) {
        cyclelessTree.children = tree.children.map(removeCycles);
      };
      if (cyclelessTree.parent) delete cyclelessTree.parent;
      return cyclelessTree;
    };

    const result = { children: [] };
    let current = result;
    const timestamps = [];

    const attach = (token) => {
      current.children.push({
        type: 'object',
        name: token[1],
        classes: token[2],
        children: [],
        parent: current
      });
      current = current.children[current.children.length - 1];
    };

    const inScope = (name) => {
      let node = current;
      while (node) {
        if (node.name == name) return true;
        node = node.parent;
      };
      return;
    };

    while (this.line[this.pos] != undefined) {
      const token = this.nextToken();
      if (token[0] == 'text') {
        current.children.push({ type: 'text', value: token[1], parent: current });
      } else if (token[0] == 'start tag') {
        if (this.mode == 'chapters') {
          this.err('Start tags not allowed in chapter title text.');
        };
        const name = token[1];
        if (name != 'v' && name != 'lang' && token[3] != '') {
          this.err('Only <v> and <lang> can have an annotation.');
        };
        if (name == 'c' || name == 'i' || name == 'b' || name == 'u' || name == 'ruby') {
          attach(token);
        } else if (name == "rt" && current.name == 'ruby') {
          attach(token);
        } else if (name == 'v') {
          if (inScope('v')) {
            this.err('<v> cannot be nested inside itself.');
          };
          attach(token);
          current.value = token[3]; // annotation
          if (!token[3]) {
            this.err('<v> requires an annotation.');
          };
        } else if (name == 'lang') {
          attach(token);
          current.value = token[3]; // language
        } else {
          this.err('Incorrect start tag.');
        };
      } else if (token[0] == 'end tag') {
        if (this.mode == 'chapters') {
          this.err('End tags not allowed in chapter title text.');
        };
        // XXX check <ruby> content
        if(token[1] == current.name) {
          current = current.parent
        } else if(token[1] == 'ruby' && current.name == 'rt') {
          current = current.parent.parent;
        } else {
          this.err('Incorrect end tag.');
        };
      } else if (token[0] == 'timestamp') {
        if (this.mode == 'chapters') {
          this.err('Timestamp not allowed in chapter title text.');
        };
        const timings = new WebVTTCueTimingsAndSettingsParser(token[1], this.err);
        const timestamp = timings.parseTimestamp();
        if (timestamp != undefined) {
          if (timestamp <= cueStart || timestamp >= cueEnd) {
            this.err('Timestamp must be between start timestamp and end timestamp.');
          };
          if (timestamps.length > 0 && timestamps[timestamps.length-1] >= timestamp) {
            this.err('Timestamp must be greater than any previous timestamp.');
          };
          current.children.push({type: 'timestamp', value: timestamp, parent: current});
          timestamps.push(timestamp);
        };
      };
    };
    while (current.parent) {
      if (current.name != 'v') {
        this.err('Required end tag missing.');
      };
      current = current.parent;
    };

    return removeCycles(result);
  };

  nextToken = () => {
    let state = 'data';
    let result = '';
    let buffer = '';
    const classes = [];

    while (this.line[this.pos - 1] != undefined || this.pos == 0) {
      const currentChar = this.line[this.pos];
      if (state == 'data') {
        if (currentChar == '&') {
          buffer = currentChar;
          state = 'escape';
        } else if (currentChar == '<' && result == '') {
          state = 'tag';
        } else if (currentChar == '<' || currentChar == undefined) {
          return ['text', result];
        } else {
          result += currentChar;
        };
      } else if (state == 'escape') {
        if (currentChar == "<" || currentChar == undefined) {
          this.err('Incorrect escape.');
          let matchResult;
          if (matchResult = buffer.match(/^&#([0-9]+)$/)) {
            result += String.fromCharCode(matchResult[1])
          } else {
            if (this.entities[buffer]) {
              result += this.entities[buffer];
            } else {
              result += buffer;
            };
          };
          return ['text', result];
        } else if (currentChar == '&') {
          this.err('Incorrect escape.');
          result += buffer;
          buffer = currentChar;
        } else if(/[a-z#0-9]/i.test(currentChar)) {
          buffer += currentChar;
        } else if (currentChar == ';') {
          let matchResult;
          if (matchResult = buffer.match(/^&#(x?[0-9]+)$/)) {
            // we prepend "0" so that x20 be interpreted as hexadecim (0x20)
            result += String.fromCharCode("0" + matchResult[1]);
          } else if (this.entities[buffer + currentChar]) {
            result += this.entities[buffer + currentChar];
          } else if (matchResult = Object.keys(this.entities).find(entity => buffer.startsWith(entity))) { // partial match
            result += this.entities[matchResult] + buffer.slice(matchResult.length) + currentChar;
          } else {
            this.err('Incorrect escape.');
            result += buffer + ';';
          }
          state = 'data';
        } else {
          this.err('Incorrect escape.');
          result += buffer + currentChar;
          state = 'data';
        };
      } else if(state == 'tag') {
        if (currentChar == '\t' || currentChar == '\n' || currentChar == '\f' || currentChar == ' ') {
          state = 'start tag annotation';
        } else if(currentChar == ".") {
          state = 'start tag class';
        } else if(currentChar == "/") {
          state = 'end tag';
        } else if (/\d/.test(currentChar)) {
          result = currentChar;
          state = 'timestamp tag';
        } else if (currentChar == ">" || currentChar == undefined) {
          if (currentChar == '>') this.pos++;
          return ['start tag', '', [], ''];
        } else {
          result = currentChar;
          state = 'start tag';
        };
      } else if (state == 'start tag') {
        if (currentChar == '\t' || currentChar == '\n' || currentChar == '\f' || currentChar == ' ') {
          if (currentChar == '\n') buffer = currentChar;
          state = 'start tag annotation';
        } else if(currentChar == ".") {
          state = 'start tag class';
        } else if (currentChar == ">" || currentChar == undefined) {
          if (currentChar == '>') this.pos++;
          return ['start tag', result, [], ''];
        } else {
          result += currentChar;
        };
      } else if (state == 'start tag class') {
        if (currentChar == '\t' || currentChar == '\n' || currentChar == '\f' || currentChar == ' ') {
          if (buffer) classes.push(buffer);
          buffer = (currentChar == '\n') ? currentChar : '';
          state = 'start tag annotation';
        } else if(currentChar == ".") {
          if (buffer) classes.push(buffer);
          buffer = '';
        } else if (currentChar == ">" || currentChar == undefined) {
          if (currentChar == '>') this.pos++;
          if (buffer) classes.push(buffer);
          return ['start tag', result, classes, ''];
        } else {
          buffer += currentChar;
        };
      } else if (state == 'start tag annotation') {
        if (currentChar == ">" || currentChar == undefined) {
          if (currentChar == '>') this.pos++;
          buffer = buffer.split(/[\u0020\t\f\r\n]+/).filter((item) => { if(item) return true }).join(' ');
          return ['start tag', result, classes, buffer];
        } else {
          buffer += currentChar;
        };
      } else if (state == 'end tag') {
        if (currentChar == ">" || currentChar == undefined) {
          if (currentChar == '>') this.pos++;
          return ['end tag', result];
        } else {
          result += currentChar;
        };
      } else if (state == 'timestamp tag') {
        if (currentChar == ">" || currentChar == undefined) {
          if (currentChar == '>') this.pos++;
          return ['timestamp', result];
        } else {
          result += currentChar;
        };
      } else {
        this.err('Never happens.'); // The joke is it might.
      };
      // 8
      this.pos++;
    };
  };
};

export class WebVTTSerializer {
  constructor() {};

  serializeTimestamp = (seconds) => {
    let hour = Math.floor(seconds / 3600);
    let min = Math.floor((seconds % 3600) / 60);
    let sec = Math.floor(seconds % 60);

    const HH = String(hour).padStart(2, '0');
    const MM = String(min).padStart(2, '0');
    const SS = String(sec).padStart(2, '0');
    const sss = ('00' + (seconds - Math.floor(seconds)).toFixed(3) * 1000).slice(-3);

    return `${HH}:${MM}:${SS}.${sss}`;
  };

  serializeCueSettings = (cue) => {
    const defaultCueSettings = Cue.getDefaultCueSettings();
    let result = '';
    const nonDefaultSettings = Object.keys(defaultCueSettings).filter(s => cue[s] !== defaultCueSettings[s]);
    if (nonDefaultSettings.includes('direction')) {
      result += ` vertical:${cue.direction}`;
    };
    if (nonDefaultSettings.includes('alignment')) {
      result += ` align:${cue.alignment}`;
    };
    if (nonDefaultSettings.includes('size')) {
      result += ` size:${cue.size}%`;
    };
    if (nonDefaultSettings.includes('lineAlign') || nonDefaultSettings.includes('linePosition')) {
      const snapToLines = cue.snapToLines ? '' : '%';
      const lineAlign = cue.lineAlign && cue.lineAlign != defaultCueSettings.lineAlign ? `,${cue.lineAlign}` : ''; 
      result += ` line:${cue.linePosition}${snapToLines}${lineAlign}`;
    };
    if (nonDefaultSettings.includes('textPosition') || nonDefaultSettings.includes('positionAlign')) {
      const positionAlign = cue.positionAlign && cue.positionAlign !== defaultCueSettings.positionAlign ? `,${cue.positionAlign}` : '';
      result += ` position:${cue.textPosition}%${positionAlign}`;
    };
    return result;
  };

  serializeTree = (tree) => {
    let result = '';

    for (let i = 0; i < tree.length; i++) {
      let node = tree[i];

      const { type, name, classes, value, children } = node;

      if (type === 'text') {
        result += value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      } else if (type === 'object') {
        result += `<${name}${classes ? classes.map(c => `.${c}`).join('') : ''}${value ? ` ${value}` : ''}>`;
        if (children) result += this.serializeTree(children);
        result += `</${name}>`;
      } else if (type === 'timestamp') {
        result += `<${this.serializeTimestamp(value)}>`;
      } else {
        result += `<${value}>`;
      };
    };

    return result;
  };

  serializeCue = (cue) => {
    const cueId = cue.id !== undefined ? cue.id + '\n' : '';
    const startTime = this.serializeTimestamp(cue.startTime);
    const endTime = this.serializeTimestamp(cue.endTime);
    const cueSettings = this.serializeCueSettings(cue);
    const treeChildren = cue.tree && cue.tree.children ? this.serializeTree(cue.tree.children) : '';


    return `${cueId}${startTime} --> ${endTime}${cueSettings}\n${treeChildren}\n\n`;
  };

  serializeStyle = (style) => {
    return `STYLE\n${style}\n\n`;
  };

  serialize = (cues, styles) => {
    let result = 'WEBVTT\n\n';

    if (styles) {
      for (const style of styles) {
        result += this.serializeStyle(style);
      };
    };

    for (const cue of cues) {
      result += this.serializeCue(cue);
    };

    return result;
  };
};
