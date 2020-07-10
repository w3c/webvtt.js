assert_equals(cues.length, 3);

Array.from(cues).forEach(function(cue, index) {
    assert_equals(cue.text, 'text' + index, 'Failed with cue ' + index);
    assert_equals(cue.startTime, 0, 'Failed with cue ' + index);
    assert_equals(cue.endTime, 1, 'Failed with cue ' + index);
});
