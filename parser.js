// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

// Not intended to be fast, but if you can make it faster, please help out!

var WebVTTParser = function() {
  this.parse = function(input, mode) {
    input = input.replace(/\0/g, '')
    
    var NEWLINE = /\r\n|\r|\n/,
        startTime = Date.now(),
        linePos = 0,
        lines = input.split(NEWLINE),
        alreadyCollected = false,
        cues = [],
        errors = []
    function err(message, col) {
      errors.push({message:message, line:linePos+1, col:col})
    }

    var line = lines[linePos],
        lineLength = line.length,
        signature = "WEBVTT"

    // See comments around line 113 -- some changes were made to this class.
    var timings = new WebVTTCueTimingsAndSettingsParser(err, mode)

    /* SIGNATURE */
    if (
      // This regular expression runs at twice the speed of the five
      // comparators and uses fewer bytes in the final program after
      // minification. The only cost is that regular expresisons are
      // a bit ugly and hard to read.
      ! /^\ufeff?WEBVTT(\s.+)?$/.test(line)
    ) {
      err("No valid signature. (File needs to start with \"WEBVTT\".)")
    }

    linePos++

    /* HEADER */
    while(lines[linePos] != "" && lines[linePos] != undefined) {
      err("No blank line after the signature.")
      if(lines[linePos].indexOf("-->") != -1) {
        alreadyCollected = true
        break
      }
      linePos++
    }

    /* CUE LOOP */
    while(lines[linePos] != undefined) {
      var cue
      while(!alreadyCollected && lines[linePos] == "") {
        linePos++
      }
      if(!alreadyCollected && lines[linePos] == undefined)
        break

      /* CUE CREATION */
      cue = {
        id:"",
        startTime:0,
        endTime:0,
        pauseOnExit:false,
        direction:"horizontal",
        snapToLines:true,
        linePosition:"auto",
        textPosition:50,
        size:100,
        alignment:"middle",
        text:"",
        tree:null
      }

      var parseTimings = true

      if(lines[linePos].indexOf("-->") == -1) {
        cue.id = lines[linePos]

        /* COMMENTS
           Not part of the specification's parser as these would just be ignored. However,
           we want them to be conforming and not get "Cue identifier cannot be standalone".
         */
        if(/^NOTE($|[ \t])/.test(cue.id)) { // .startsWith fails in Chrome
          linePos++
          while(lines[linePos] != "" && lines[linePos] != undefined) {
            if(lines[linePos].indexOf("-->") != -1)
              err("Cannot have timestamp in a comment.")
            linePos++
          }
          continue
        }

        linePos++

        if(lines[linePos] == "" || lines[linePos] == undefined) {
          err("Cue identifier cannot be standalone.")
          continue
        }

        if(lines[linePos].indexOf("-->") == -1) {
          parseTimings = false
          err("Cue identifier needs to be followed by timestamp.")
        }
      }

      /* TIMINGS */
      alreadyCollected = false
      // We're spinning up an oject instance once for every line of the
      // WebVTT file. That means creating new anonymous functions, new
      // variables, instantiating everything, running the constructor...
      // It's a waste of time and RAM. Let's make the settings parser a
      // singleton and adjust the .parse() function to accept a string.
      // The error handler can be passed when we build our only instance.
//      var timings = new WebVTTCueTimingsAndSettingsParser(lines[linePos], err)
      var previousCueStart = 0
      if(cues.length > 0) {
        previousCueStart = cues[cues.length-1].startTime
      }
      if(parseTimings && !timings.parse(lines[linePos], cue, previousCueStart)) {
        /* BAD CUE */

        cue = null
        linePos++

        /* BAD CUE LOOP */
        while(lines[linePos] != "" && lines[linePos] != undefined) {
          if(lines[linePos].indexOf("-->") != -1) {
            alreadyCollected = true
            break
          }
          linePos++
        }
        continue
      }
      linePos++

      /* CUE TEXT LOOP */
      while(lines[linePos] != "" && lines[linePos] != undefined) {
        if(lines[linePos].indexOf("-->") != -1) {
          err("Blank line missing before cue.")
          alreadyCollected = true
          break
        }
        // Instead of running one comparator and one concatenation operator
        // per loop, we can run one concatenation operator per loop and
        // one substring operator EVER.
        cue.text += lines[linePos] + "\n"
        linePos++
      }
      cue.text = cue.text.slice(0, -1)

      /* CUE TEXT PROCESSING */
      // Oddly enough, I tried making this a singleton and when I benchmarked
      // it, it ran SLOWER. I have no idea why.
      var cuetextparser = new WebVTTCueTextParser(cue.text, err, mode)
      cue.tree = cuetextparser.parse(cue.startTime, cue.endTime)
      cues.push(cue)
    }
    cues.sort(function(a, b) {
      // One comparator, one subtraction instead of 4
      // comparators. Speed is only improved by about
      // 10% but it's more compact.
      if (a.startTime == b.startTime)
        return b.endTime - a.endTime
      else
        return a.startTime - b.startTime
    })

    /* END */
    return {cues:cues, errors:errors, time:Date.now()-startTime}
  }
}

// See comments around line 113, this class was slightly tweaked
var WebVTTCueTimingsAndSettingsParser = function(errorHandler, mode) {
  var SPACE = /[\u0020\t\f]/,
      NOSPACE = /[^\u0020\t\f]/,
      line = "",//line,
      pos = 0,
      err = function(message) {
        errorHandler(message, pos+1)
      },
      spaceBeforeSetting = true
  function skip(pattern) {
    while(
      line[pos] != undefined &&
      pattern.test(line[pos])
    ) {
      pos++
    }
  }
  function collect(pattern) {
    var str = ""
    while(
      line[pos] != undefined &&
      pattern.test(line[pos])
    ) {
      str += line[pos]
      pos++
    }
    return str
  }
  /* http://dev.w3.org/html5/webvtt/#collect-a-webvtt-timestamp */
  // There's a fun hack in JavaScript to convert a properly formatted
  // time string to a number of milliseconds:
  //     new Date("January 1, 1970 " + input + " GMT").getTime()
  // This has two limitations:
  //     1. It cannot accept commas as decimal separators (00:01:15,000)
  //     2. It assumes the input starts with hours (00:15.000 = 15 minutes, not 15 seconds)
  // We can speed up timestamp parsing and reduce program complexity at
  // the cost of error message specificity.
  function timestamp() {
    // Extract the whole timestamp string
    var timestampStr = line.substr(pos).split(SPACE)[0]
    pos += timestampStr.length
    // If there's a comma, assume it's a decimal separator and convert to period
    timestampStr = timestampStr.replace(',', '.')
    // If there's only one colon, add hours
    if(/^[^:]+:[^:]+$/.test(timestampStr))
      timestampStr = "00:" + timestampStr;
    // Convert from string to time
    // Multiply by 1000 to convert milliseconds to seconds
    var ts = new Date("January 1, 1970 " + timestampStr + " GMT").getTime() * 1000;

    if( isNaN(ts) ) {
      err("Timestamp is invalid.")
      return
    }
    return ts
  }

  /* http://dev.w3.org/html5/webvtt/#parse-the-webvtt-settings */
  function parseSettings(input, cue) {
    var settings = input.split(SPACE),
        seen = []
    for(var i=0; i < settings.length; i++) {
      if(settings[i] == "")
        continue

      // It's faster to use a single split() than
      // indexOf() and two slice()'s
      var parts = settings[i].split(':'),
          setting = parts[0],
          value = parts[1]

      if(seen.indexOf(setting) != -1) {
        err("Duplicate setting.")
      }
      seen.push(setting)

      if(value == "") {
        err("No value for setting defined.")
        return
      }

      if(setting == "vertical") { // writing direction
        if(value != "rl" && value != "lr") {
          // This said 'rl' or 'rl' -- probably a typo
          err("Writing direction can only be set to 'rl' or 'lr'.")
          continue
        }
        cue.direction = value
      } else if(setting == "line") { // line position
        // The following regular expession will accomplish the goal of
        // all four if statements here. However by using the regular
        // expression we lose the more specific error messaging.
        if( ! /^(-?\d+$|\d+%$)/.test(value) ) {
          err("Line position takes a number or percentage.")
          continue
        }
        if(value[value.length-1] == "%") {
          if(parseInt(value, 10) > 100) {
            err("Line position cannot be >100%.")
            continue
          }
          cue.snapToLines = false
        }
        cue.linePosition = parseInt(value, 10)
      } else if(setting == "position") { // text position
        if(value[value.length-1] != "%") {
          err("Text position must be a percentage.")
          continue
        }
        if(parseInt(value, 10) > 100) {
          err("Size cannot be >100%.")
          continue
        }
        cue.textPosition = parseInt(value, 10)
      } else if(setting == "size") { // size
        if(value[value.length-1] != "%") {
          err("Size must be a percentage.")
          continue
        }
        if(parseInt(value, 10) > 100) {
          err("Size cannot be >100%.")
          continue
        }
        cue.size = parseInt(value, 10)
      } else if(setting == "align") { // alignment
        var alignValues = ["start", "middle", "end", "left", "right"]
        if(alignValues.indexOf(value) == -1) {
          err("Alignment can only be set to one of " + alignValues.join(", ") + ".")
          continue
        }
        cue.alignment = value
      } else {
        err("Invalid setting.")
      }
    }
  }

  // See line 113
  this.parse = function(lineToParse, cue, previousCueStart) {
    line = lineToParse
    pos = 0
    skip(SPACE)
    cue.startTime = timestamp()
    if(cue.startTime == undefined) {
      return
    }
    if(cue.startTime < previousCueStart) {
      err("Start timestamp is not greater than or equal to start timestamp of previous cue.")
    }
    if(NOSPACE.test(line[pos])) {
      err("Timestamp not separated from '-->' by whitespace.")
    }
    skip(SPACE)
    // 6-8
    if(line[pos] != "-") {
      err("No valid timestamp separator found.")
      return
    }
    pos++
    if(line[pos] != "-") {
      err("No valid timestamp separator found.")
      return
    }
    pos++
    if(line[pos] != ">") {
      err("No valid timestamp separator found.")
      return
    }
    pos++
    if(NOSPACE.test(line[pos])) {
      err("'-->' not separated from timestamp by whitespace.")
    }
    skip(SPACE)
    cue.endTime = timestamp()
    if(cue.endTime == undefined) {
      return
    }
    if(cue.endTime <= cue.startTime) {
      err("End timestamp is not greater than start timestamp.")
    }

    if(NOSPACE.test(line[pos])) {
      spaceBeforeSetting = false
    }
    skip(SPACE)
    parseSettings(line.substring(pos), cue)
    return true
  }
  this.parseTimestamp = function() {
    var ts = timestamp()
    if(line[pos] != undefined) {
      err("Timestamp must not have trailing characters.")
      return
    }
    return ts
  }
}

var WebVTTCueTextParser = function(line, errorHandler, mode) {
  var line = line,
      pos = 0,
      err = function(message) {
        if(mode == "metadata")
          return
        errorHandler(message, pos+1)
      }

  this.parse = function(cueStart, cueEnd) {
    var result = {children:[]},
        current = result,
        timestamps = []

    function attach(token) {
      current.children.push({type:"object", name:token[1], classes:token[2], children:[], parent:current})
      current = current.children[current.children.length-1]
    }
    function inScope(name) {
      var node = current
      while(node) {
        if(node.name == name)
          return true
        node = node.parent
      }
      return
    }

    while(line[pos] != undefined) {
      var token = nextToken()
      if(token[0] == "text") {
        current.children.push({type:"text", value:token[1], parent:current})
      } else if(token[0] == "start tag") {
        if(mode == "chapters")
          err("Start tags not allowed in chapter title text.")
        var name = token[1]
        if(name != "v" && name != "lang" && token[3] != "") {
          err("Only <v> and <lang> can have an annotation.")
        }
        if(
          // Regular expression is more compact and runs twice as fast
          /^(c|i|b|u|ruby)$/.test(name)
        ) {
          attach(token)
        } else if(name == "rt" && current.name == "ruby") {
          attach(token)
        } else if(name == "v") {
          if(inScope("v")) {
            err("<v> cannot be nested inside itself.")
          }
          attach(token)
          current.value = token[3] // annotation
          if(!token[3]) {
            err("<v> requires an annotation.")
          }
        } else if(name == "lang") {
          attach(token)
          current.value = token[3] // language
        } else {
          err("Incorrect start tag.")
        }
      } else if(token[0] == "end tag") {
        if(mode == "chapters")
          err("End tags not allowed in chapter title text.")
        // XXX check <ruby> content
        if(token[1] == current.name) {
          current = current.parent
        } else if(token[1] == "ruby" && current.name == "rt") {
          current = current.parent.parent
        } else {
          err("Incorrect end tag.")
        }
      } else if(token[0] == "timestamp") {
        if(mode == "chapters")
          err("Timestamp not allowed in chapter title text.")
        // Why spin up an instance of WebVTCueTimingsAndSettingsParser just to run one function?
        //var timings = new WebVTTCueTimingsAndSettingsParser(token[1], err, mode),
        //timestamp = timings.parseTimestamp()
        token[1] = token[1].replace(',', '.')
        if(/^[^:]+:[^:]+$/.test(token[1]))
          token[1] = "00:" + token[1];
        timestamp = new Date("January 1, 1970 " + token[1] + " GMT").getTime() * 1000;
        if(!isNaN(timestamp)) {
          if(timestamp <= cueStart || timestamp >= cueEnd) {
            err("Timestamp must be between start timestamp and end timestamp.")
          }
          if(timestamps.length > 0 && timestamps[timestamps.length-1] >= timestamp) {
            err("Timestamp must be greater than any previous timestamp.")
          }
          current.children.push({type:"timestamp", value:timestamp, parent:current})
          timestamps.push(timestamp)
        }
      }
    }
    while(current.parent) {
      if(current.name != "v") {
        err("Required end tag missing.")
      }
      current = current.parent
    }
    return result
  }

  // This function is, understandably, where we spend most of our time. As such
  // any changes that can be made to improve its speed are important
  // Instead of having to walk through several "if" statements on a per-character
  // basis, it might improve speed a lot to have multiple mini-while loops
  // within each state and only break when the state changes
  function nextToken() {

    // Although it doesn't really impact speed, string literals cannot
    // be minified. Just to make my OCD happy I converted all states to
    // integers

    // "data" = 1
    // "escape" = doesn't exist anymore
    // "tag" = 2
    // "start tag" = 3
    // "start tag class" = 4
    // "start tag annotation" = 5
    // "end tag" = 6
    // "timestamp tag" = 7

    var state = 1,
        result = "",
        buffer = "",
        classes = [],
        escapes = {
          '&amp': '&',
          '&lt': '<',
          '&gt': '>',
          '&lrm': '\u200e',
          '&rlm': '\u200f',
          '&nbsp': '\u00A0'
        }
    // Running benchmarks in Chrome, pos <= line.length is quicker
    // than line[pos-1] != undefined
    while(pos <= line.length) {
      var c = line[pos]
      if(state == 1) {
        if(c == "&") {
          // We can grab entire escape sequences in one bite
          buffer = line.substring(pos, line.indexOf(';', pos))
          if( escapes[buffer] )
            result += escapes[ buffer ]
          else {
            err("Incorrect escape.")
            result += buffer + ";"
          }
        } else if(c == "<" && result == "") {
          state = 2
        } else if(c == "<" || c == undefined) {
          return ["text", result]
        } else {
          result += c
        }
      } else if(state == 2) {
        // Bencharmking this it was 30% faster in Chrome
//        if(c == "\t" || c == "\n" || c == "\f" || c == " ") {
        if(/[\t\n\f ]/.test(c)) {
          state = 5
        } else if(c == ".") {
          state = 4
        } else if(c == "/") {
          state = 6
        } else if(/\d/.test(c)) {
          result = c
          state = 7
        } else if(c == ">" || c == undefined) {
          if(c == ">") {
            pos++
          }
          return ["start tag", "", [], ""]
        } else {
          result = c
          state = 3
        }
      } else if(state == 3) {
        if(/[\t\f ]/.test(c)) {
          state = 5
        } else if(c == "\n") {
          buffer = c
          state = 5
        } else if(c == ".") {
          state = 4
        } else if(c == ">" || c == undefined) {
          if(c == ">") {
            pos++
          }
          return ["start tag", result, [], ""]
        } else {
          result += c
        }
      } else if(state == 4) {
        if(/[\t\f ]/.test(c)) {
          classes.push(buffer)
          buffer = ""
          state = 5
        } else if(c == "\n") {
          classes.push(buffer)
          buffer = c
          state = 5
        } else if(c == ".") {
          classes.push(buffer)
          buffer = ""
        } else if(c == ">" || c == undefined) {
          if(c == ">") {
            pos++
          }
          classes.push(buffer)
          return ["start tag", result, classes, ""]
        } else {
          buffer += c
        }
      } else if(state == 5) {
        if(c == ">" || c == undefined) {
          if(c == ">") {
            pos++
          }
          // A faster and more concise way to accomplish the same goal
//          buffer = buffer.split(/[\u0020\t\f\r\n]+/).filter(function(item) { if(item) return true }).join(" ")
          buffer = buffer.replace(/[\u0020\t\f\r\n]+/g, ' ').trim()
          return ["start tag", result, classes, buffer]
        } else {
          buffer +=c
        }
      } else if(state == 6) {
        if(c == ">" || c == undefined) {
          if(c == ">") {
            pos++
          }
          return ["end tag", result]
        } else {
          result += c
        }
      } else if(state == 7) {
        if(c == ">" || c == undefined) {
          if(c == ">") {
            pos++
          }
          return ["timestamp", result]
        } else {
          result += c
        }
      } else {
        err("Never happens.") // The joke is it might.
      }
      // 8
      pos++
    }
  }
}

var WebVTTSerializer = function() {
  function serializeTree(tree) {
    var result = ""
    for (var i = 0; i < tree.length; i++) {
      var node = tree[i]
      if(node.type == "text") {
        result += node.value
      } else if(node.type == "object") {
        result += "<" + node.name
        if(node.classes) {
          for(var y = 0; y < node.classes.length; y++) {
            result += "." + node.classes[y]
          }
        }
        if(node.value) {
          result += " " + node.value
        }
        result += ">"
        if(node.children)
          result += serializeTree(node.children)
        result += "</" + node.name + ">"
      } else {
        result += "<" + node.value + ">"
      }
    }
    return result
  }
  function serializeCue(cue) {
    return cue.startTime + " " + cue.endTime + "\n" + serializeTree(cue.tree.children) + "\n\n"
  }
  this.serialize = function(cues) {
    var result = ""
    for(var i=0;i<cues.length;i++) {
      result += serializeCue(cues[i])
    }
    return result
  }
}
