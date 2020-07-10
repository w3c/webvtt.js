assert_equals(cues.length, 22);

var valid_positions = [
    [1, 'auto'],
    [100, 'auto'],
    [1, 'auto'],
    [1.5, 'auto'],
    [1, 'line-left'],
    [1, 'center'],
    [1, 'line-right'],
    [1, 'auto'],
];
valid_positions.forEach(function(pair, index) {
    var position = pair[0];
    var positionAlign = pair[1];

    assert_equals(cues[index].position, position, 'Failed with cue ' + index);
    assert_equals(cues[index].positionAlign, positionAlign, 'Failed with cue ' + index);
});

for (var i = 0; i < 14; i++) {
    var index = valid_positions.length + i;

    assert_equals(cues[index].position, 'auto', 'Failed with cue ' + index);
    assert_equals(cues[index].positionAlign, 'auto', 'Failed with cue ' + index);
}
