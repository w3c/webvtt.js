assert_equals(cues.length, 6);

var regions = Array.from(cues).map(function(cue) {
    return cue.region;
});

var valid_lines = [
    '',
    'up',
    'up',
    '',
    '',
    'up',
].forEach(function(valid, index) {
    assert_equals(regions[index].scroll, valid, 'Failed with region ' + index);
});
