assert_equals(cues.length, 4);

[
    [0, 0],
    [1, 0.999],
    [60, 59.999],
    [3600, 3599.999],
].forEach(function(pair, index) {
    var startTime = pair[0];
    var endTime = pair[1];

    assert_equals(cues[index].text, 'text' + index, 'Failed with cue ' + index);
    assert_equals(cues[index].startTime, startTime, 'Failed with cue ' + index);
    assert_equals(cues[index].endTime, endTime, 'Failed with cue ' + index);
});
