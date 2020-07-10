assert_equals(cues.length, 9);

var fooRegion = cues[0].region;
assert_true(!!fooRegion, 'Cue 0 has invalid region');

var barRegion = cues[1].region;
assert_true(!!barRegion, 'Cue 1 has invalid region');

assert_not_equals(fooRegion, barRegion);

var valid_regions = [
    fooRegion,
    barRegion,
    barRegion,
    null,
    fooRegion
];
valid_regions.forEach(function(valid, index) {
    assert_equals(cues[index].region, valid, 'Failed with cue ' + index);
});

for (var i = 0; i < 4; i++) {
    var index = valid_regions.length + i;

    assert_equals(cues[index].region, null);
}
