assert_equals(cues.length, 2);

assert_equals(cues[0].text, 'text1');
assert_equals(cues[0].startTime, 0);
assert_equals(cues[0].endTime, 216001);

assert_equals(cues[1].text, 'text2');
assert_equals(cues[1].startTime, 216000);
assert_equals(cues[1].endTime, 216001);
