assert_equals(cues.length, 4);

assert_equals(cues[0].id, "cr");
assert_equals(cues[0].text, "text0");

assert_equals(cues[1].id, "lf");
assert_equals(cues[1].text, "text1");

assert_equals(cues[2].id, "crlf");
assert_equals(cues[2].text, "text2");

assert_equals(cues[3].id, "lfcr");
assert_equals(cues[3].text, "text3");
