assert_equals(cues.length, 16);

var valid_sizes = [
    100,
    2,
    0,
    0,
    100,
    50,
    1.5,
];
valid_sizes.forEach(function(valid, index) {
    assert_equals(cues[index].size, valid, 'Failed with cue ' + index);
});

for (var i = 0; i < 9; i++) {
    var index = valid_sizes.length + i;

    assert_equals(cues[index].size, 100, 'Failed with cue ' + index);
}
