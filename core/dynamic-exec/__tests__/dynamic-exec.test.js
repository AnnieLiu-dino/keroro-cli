'use strict';

const dynamicExec = require('..');
const assert = require('assert').strict;

assert.strictEqual(dynamicExec(), 'Hello from dynamicExec');
console.info('dynamicExec tests passed');
