'use strict';

const npmInfo = require('..');
const assert = require('assert').strict;

assert.strictEqual(npmInfo(), 'Hello from npmInfo');
console.info('npmInfo tests passed');
