assert_equals(cues.length, 13);

[
    'center',
    'start',
    'center',
    'end',
    'left',
    'right',
    'end',
    'end',
    'end',
    'end',
    'end',
    'end',
    'center',
].forEach(function(valid, index) {
    assert_equals(cues[index].align, valid, 'Failed with cue ' + index);
});
