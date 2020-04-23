// TODO: turn this into a proper test file using node-jqunit
var coordToA1 = require('../src/coordToA1');
var fluid = fluid || require('infusion');

var tests = {
    1: 'A',
    2: 'B',
    3: 'C',
    4: 'D',
    5: 'E',
    6: 'F',
    7: 'G',
    8: 'H',
    9: 'I',
    10: 'J',
    11: 'K',
    12: 'L',
    13: 'M',
    14: 'N',
    15: 'O',
    16: 'P',
    17: 'Q',
    18: 'R',
    19: 'S',
    20: 'T',
    21: 'U',
    22: 'V',
    23: 'W',
    24: 'X',
    25: 'Y',
    26: 'Z',
    27: 'AA',
    51: 'AY',
    52: 'AZ',
    53: 'BA',
    77: 'BY',
    78: 'BZ',
    79: 'CA',
    80: 'CB',
    234: 'HZ',
    675: 'YY',
    676: 'YZ',
    677: 'ZA',
    702: 'ZZ',
    703: 'AAA',
    731: 'ABC',
    6088: 'HZD',
    17577: 'YZA',
    17603: 'ZAA',
    17628: 'ZAZ',
    18278: 'ZZZ',
    18279: 'AAAA'
};

for (let input in tests) {
    let result = coordToA1(parseInt(input), 1);
    if (result === tests[input] + '1') {
        continue;
    } else {
        fluid.log(fluid.logLevel.FAIL, `coordToA1(${input}, ${1}) returns ${result}, when it should return ${tests[input]}1`);
    }
}

fluid.log(fluid.logLevel.WARN, 'All tests pass');
