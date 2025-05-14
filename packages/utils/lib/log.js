'use strict'

const npmlog = require('npmlog')
// 前缀
npmlog.heading = 'keroro-cli'
// 前缀样式
npmlog.headingStyle = {
    bg: 'blue',
}

// 判断环境变量 是否debug模式
npmlog.level = process.env.KERORO_CLI_LOG_LEVEL
    ? process.env.KERORO_CLI_LOG_LEVEL
    : 'info'

// 自定义log命令：log.success('xxx')
npmlog.addLevel('success', 2000, { fg: 'green', bold: true })
npmlog.addLevel('error', 2000, { fg: 'red', bold: true })

npmlog.module = function () {
    const [module, ...message] = arguments
    npmlog.addLevel(
        module,
        1000,
        { fg: 'yellow', bg: 'white', bold: true },
        module,
    )
    const msg = message.join(' ')
    npmlog[module](msg)
}

module.exports = npmlog
