assert_equals(cues.length, 3);

assert_equals(cues[0].id, 'spaces');
assert_equals(cues[0].text, '   text0');

assert_equals(cues[1].id, 'tabs');
assert_equals(cues[1].text, 'text1');

assert_equals(cues[2].id, 'form feed');
assert_equals(cues[2].text, 'text2');
