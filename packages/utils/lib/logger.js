'use strict'
const { consola } = require('consola')

const LEVEL_MAP = {
    error: 1,
    warn: 2,
    info: 4,
    debug: 7,
}
const levelStr = process.env.KERORO_CLI_LOG_LEVEL?.toLowerCase() || 'info'
consola.level = LEVEL_MAP[levelStr] ?? LEVEL_MAP['info']

const logger = consola.withTag('keroro')
module.exports = logger
