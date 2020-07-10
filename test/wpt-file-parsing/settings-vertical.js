assert_equals(cues.length, 8);

var valid_vertical = [
    '',
    'lr',
    'rl',
    'lr',
];
valid_vertical.forEach(function(valid, index) {
    assert_equals(cues[index].vertical, valid, 'Failed with cue ' + index);
});

for (var i = 0; i < 4; i++) {
    var index = valid_vertical.length + i;

    assert_equals(cues[index].vertical, '', 'Failed with cue ' + index);
}
