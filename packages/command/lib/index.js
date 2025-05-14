'use strict'

const semver = require('semver')
const { logger } = require('@keroro-cli/utils')

const LOWEST_NODE_VERSION = '12.0.0'

class Command {
    _argv
    _cmd
    _options
    constructor(argv) {
        if (!argv) throw new Error('参数不能为空')
        if (!Array.isArray(argv)) throw new Error('参数必须是数组')
        if (argv.length < 1) throw new Error('数组长度为空')

        this._argv = argv
        let runner = new Promise((resolve, reject) => {
            let chain = Promise.resolve()
            chain = chain.then(() => this.checkNodeVersion())
            chain = chain.then(() => this.initArgs())
            chain = chain.then(() => this.initial())
            chain = chain.then(() => this.execute())
            // 单独的 异步的函数，都要有单独的 try catch
            chain.catch((e) => {
                logger.error(e.message)
            })
        })
    }

    checkNodeVersion() {
        // 1、当前node version
        const curNodeVersion = process.version
        // 2、比对 当前版本与最低版本
        const lowestNodeVersion = LOWEST_NODE_VERSION
        if (!semver.gte(curNodeVersion, lowestNodeVersion)) {
            throw new Error(`need more than node ${LOWEST_NODE_VERSION}`)
        }
    }

    // 参数初始化
    initArgs() {
        const [commandName, options] = this._argv
        logger.debug('commandName', commandName)
        logger.debug('options', options)
        this._cmd = commandName
        this._options = options
    }

    initial() {
        throw new Error('子类必须实现 initial 方法')
    }

    execute() {
        throw new Error('子类必须实现 execute 方法')
    }
}
module.exports = Command
