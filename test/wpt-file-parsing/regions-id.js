assert_equals(cues.length, 4);

var region1 = cues[0].region;
assert_equals(region1.lines, 2);

var region2 = cues[1].region;
assert_equals(region2.lines, 1);

var region3 = cues[2].region;
assert_equals(region3.lines, 3);

var region4 = cues[3].region;
assert_equals(region4.lines, 4);
