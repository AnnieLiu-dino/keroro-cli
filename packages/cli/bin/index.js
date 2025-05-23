#! /usr/bin/env node

'use strict'

const importLocal = require('import-local')
const { log } = require('@keroro-cli/utils')

// 运行keroro，优先使用本地版本
if (importLocal(__filename)) {
    log.info('keroro-cli', 'using local version of keroro-cli')
} else {
    require('../lib')(process.argv.slice(2))
    // . 相当于 加载当前目录下的 index.js
    // require("../") 上一级目录的 index.js
}
