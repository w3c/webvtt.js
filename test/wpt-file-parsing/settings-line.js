assert_equals(cues.length, 46);

// Test starts with simple valid values
var valid_values = [
    -1,
    0,
    0,
    1,
    100,
    101,
    65536,
    4294967296,
    18446744073709552000,
    10000000000000000000000000000000000,
    1.5,
    Number.MAX_VALUE,
    -1 * Number.MAX_VALUE,
    Number.MIN_VALUE,
    0, // Less than Number.MIN_VALUE
];
valid_values.forEach(function(valid, index) {
    assert_equals(cues[index].line, valid, 'Failed with cue ' + index);
    assert_true(cues[index].snapToLines, 'Failed with cue ' + index);
});

// Then a set of invalid ones
var invalid_length = 23;
for (var i = 0; i < invalid_length; i++) {
    var index = valid_values.length + i;

    assert_equals(cues[index].line, 'auto', 'Failed with cue ' + index);
    assert_true(cues[index].snapToLines, 'Failed with cue ' + index);
}

// Then more specific tests
var index = valid_values.length + invalid_length;

assert_equals(cues[index].line, 0);
assert_false(cues[index].snapToLines);

assert_equals(cues[index + 1].line, 0);
assert_false(cues[index + 1].snapToLines);

assert_equals(cues[index + 2].line, 100);
assert_false(cues[index + 2].snapToLines);
assert_equals(cues[index + 2].lineAlign, 'start');

assert_equals(cues[index + 3].line, 100);
assert_false(cues[index + 3].snapToLines);
assert_equals(cues[index + 3].lineAlign, 'start');

assert_equals(cues[index + 4].line, 100);
assert_false(cues[index + 4].snapToLines);
assert_equals(cues[index + 4].lineAlign, 'center');

assert_equals(cues[index + 5].line, 100);
assert_false(cues[index + 5].snapToLines);
assert_equals(cues[index + 5].lineAlign, 'end');

assert_equals(cues[index + 6].line, Number.MIN_VALUE);
assert_false(cues[index + 6].snapToLines);

assert_equals(cues[index + 7].line, 0);
assert_false(cues[index + 7].snapToLines);
