/**
 * Convert a column and row to A1 notation, the conventional coordinate system of spreadsheets.
 * @param {Number} column The 1-indexed column number.
 * @param {Number} row The 1-indexed row number.
 * @returns {String} The coordinate in A1 notation.
 */
var coordToA1 = function(column, row) {
    return columnNumberToLetter(column) + row;
};

module.exports = coordToA1;

/**
 * Convert a number to a column in A1 notation, the conventional coordinate system of spreadsheets.
 * @param {Number} int 1-indexed column number.
 * @returns {String} The equivalent column identifier (One or more uppercase letters from the English alphabet) 
 */
var columnNumberToLetter = function(int) {
    /*
     * The A1 column notation is not a conventional positional numeral system, 
     *  i.e. it is not base 26 with 0-p substituted for A-Z.
     * It does not have a zero, and it has a digit with the value 26 (Z).
     * Both positional numeral systems and the A1 column counting system are read from right to left as
     *      d0 + base*d1 + base^2*d2 + base^3*d3 ... base^n*dn
     * But since A1 columns have no zero element, where we would conventionally write A0, we write Z instead, then AA.
     * Therefore, we count in the regular positional procedure, but skip numbers with zeroes.
     * We can rewrite numbers with zeroes like so: A0 is equal to Z, B0 is equal to AZ, C00 is equal to BYZ, C0Y is equal to BZY, and so on.
     * Using this equivalence, all base 26 numbers can be converted into A1 column numbers by replacing zeroes with Z and decrementing the previous 'digit'.
     */
    // convert to base 26
    var togo = int.toString(26);
    // rotate to use alphabetical symbols
    togo = base26ToAlphabetical(togo);
    // iteratively replace occurrences of ?0 with predecessor(?)Z
    while (true) {
        var zeroIndex = togo.indexOf('0');
        if (zeroIndex === -1) {
            break;
        } else if (zeroIndex === 0) {
            // remove left-padding zeroes
            togo = togo.slice(1);
        } else {
            togo =
                togo.slice(0, zeroIndex - 1) +
                // decrement number before 0
                decrementAlphabetical(togo[zeroIndex - 1]) +
                // replace the 0 with Z
                'Z' +
                togo.slice(zeroIndex + 1);
        }
    }
    return togo;
};

/**
 * Rotate symbols in a base 26 number to the uppercase English alphabet, 
 * so that symbols 1-p are shifted to A-Y, preserving all zeroes.
 * @param {String} str A number in base 26.
 * @returns {String} The corresponding alphabetic number, with all 0s intact.
 */
var base26ToAlphabetical = function(str) {
    return str.replace(/\w/g, (char) => ({ 
        '0': '0',
        '1': 'A', 
        '2': 'B',
        '3': 'C',
        '4': 'D',
        '5': 'E', 
        '6': 'F', 
        '7': 'G',
        '8': 'H',
        '9': 'I', 
        'a': 'J', 
        'b': 'K',
        'c': 'L', 
        'd': 'M',
        'e': 'N',
        'f': 'O', 
        'g': 'P', 
        'h': 'Q',
        'i': 'R', 
        'j': 'S', 
        'k': 'T',
        'l': 'U', 
        'm': 'V',
        'n': 'W',
        'o': 'X',
        'p': 'Y', 
        // last entry is technically unnecessary
        'q': 'Z' 
    })[char]);
};

/**
 * Take a string consisting only of uppercase alphabetical symbols and decrement each symbol, with A->0.
 * @param {String} str The string to decrement.
 * @returns {String} The decremented string.
 */
var decrementAlphabetical = function(str) {
    return str.replace(/\w/g, (char) => ({ 
        'A': '0', 
        'B': 'A',
        'C': 'B',
        'D': 'C',
        'E': 'D', 
        'F': 'E', 
        'G': 'F',
        'H': 'G',
        'I': 'H', 
        'J': 'I', 
        'K': 'J',
        'L': 'K', 
        'M': 'L',
        'N': 'M',
        'O': 'N', 
        'P': 'O', 
        'Q': 'P',
        'R': 'Q', 
        'S': 'R', 
        'T': 'S',
        'U': 'T', 
        'V': 'U',
        'W': 'V',
        'X': 'W',
        'Y': 'X', 
        'Z': 'Y'
    })[char]);
};
