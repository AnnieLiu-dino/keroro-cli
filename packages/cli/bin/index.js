#! /usr/bin/env node
'use strict'

const importLocal = require('import-local')
const { log } = require('@keroro-cli/utils')

if (importLocal(__filename)) {
    log.info('Using local install of @keroro/cli')
} else {
    require('../lib')(process.argv.slice(2))
}
