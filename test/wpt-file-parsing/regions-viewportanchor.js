assert_equals(cues.length, 20);

var regions = Array.from(cues).map(function(cue) {
    return cue.region;
});

var valid_anchors = [
    [0, 100],
    [0, 0],
    [1, 1],
    [100, 0],
    [0, 100],
    [100, 100],
];
valid_anchors.forEach(function(pair, index) {
    var anchorX = pair[0];
    var anchorY = pair[1];

    assert_equals(regions[index].viewportAnchorX, anchorX, 'Failed with region ' + index);
    assert_equals(regions[index].viewportAnchorY, anchorY, 'Failed with region ' + index);
});

for (var i = 0; i < 14; i++) {
    var index = valid_anchors.length + i;

    assert_equals(regions[index].viewportAnchorX, 0, 'Failed with region ' + index);
    assert_equals(regions[index].viewportAnchorY, 100, 'Failed with region ' + index);
}
