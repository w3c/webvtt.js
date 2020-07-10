assert_equals(cues.length, 13);

var regions = Array.from(cues).map(function(cue) {
    return cue.region;
});

var valid_lines = [
    0,
    1,
    100,
    101,
    65536,
    4294967296,
    18446744073709552000,
    10000000000000000000000000000000000,
    2,
];
valid_lines.forEach(function(valid, index) {
    assert_equals(regions[index].lines, valid, 'Failed with region ' + index);
});

for (var i = 0; i < 4; i++) {
    var index = valid_lines.length + i;

    assert_equals(regions[index].lines, 3, 'Failed with region ' + index);
}
