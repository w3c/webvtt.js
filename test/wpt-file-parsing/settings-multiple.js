assert_equals(cues.length, 2);

var cue = cues[0];
assert_equals(cue.id, 'id0');
assert_equals(cue.text, 'text0');
assert_equals(cue.align, 'start');
assert_equals(cue.line, 1);
assert_equals(cue.snapToLines, false);
assert_equals(cue.vertical, 'lr');
assert_equals(cue.size, 50);
assert_equals(cue.position, 25);

var cue = cues[1];
assert_equals(cue.id, 'id1');
assert_equals(cue.text, 'text1');
assert_equals(cue.align, 'center');
assert_equals(cue.line, 1);
assert_equals(cue.vertical, 'rl');
assert_equals(cue.size, 0);
assert_equals(cue.position, 100);
