assert_equals(cues.length, 7, cues);

assert_equals(cues[0].id, "");
assert_equals(cues[0].text, "text0");

assert_equals(cues[1].id, "\uFFFD (null in id)");
assert_equals(cues[1].text, "text1");

assert_equals(cues[2].id, "\uFFFD (null in cue data)");
assert_equals(cues[2].text, "\uFFFDtext\uFFFD2");

assert_equals(cues[3].align, "center");
assert_equals(cues[3].text, "text3");

assert_equals(cues[4].align, "center");
assert_equals(cues[4].text, "text4");

assert_equals(cues[5].align, "center");
assert_equals(cues[5].text, "text5");

assert_equals(cues[6].align, "end");
assert_equals(cues[6].text, "text6");
