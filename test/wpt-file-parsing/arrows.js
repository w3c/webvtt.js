assert_equals(cues.length, 6);

for (var i = 0; i < cues.length; i++) {
    assert_equals(cues[i].id, '', 'Failed with cue ' + i);
    assert_equals(cues[i].text, 'text' + i, 'Failed with cue ' + i);
}
