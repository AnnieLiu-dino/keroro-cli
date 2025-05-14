'use strict'

const commander = require('commander')
const { logger } = require('@keroro-cli/utils')
const dynamicExec = require('@keroro-cli/dynamic-exec')
const pkg = require('../package.json')
const check = require('./check')

async function entry() {
    await preCheck()
    registerCommand()
}

async function preCheck() {
    try {
        check.printVersion(pkg)
        check.userAuth()
        check.userHome()
        check.checkEnv()
        await check.globalUpdate(pkg)
    } catch (e) {
        logger.info('preCheck', e.message)
    }
}

function registerCommand() {
    const cliName = Object.keys(pkg.bin)[0]
    const program = new commander.Command()

    program
        .name(cliName)
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d, --debug', 'Enable debug mode', false)
        .option(
            '-lp, --cmdLocalPath <cmdLocalPath>',
            'Local command debug path',
            '',
        )

    const create = program.command('create <projectName>')
    create
        .option('-f, --force', 'Force project creation')
        .description('Create a new project')
        .action(dynamicExec)

    // Listen for --cmdLocalPath option
    program.on('option:cmdLocalPath', function () {
        const cmdLocalPath = this.opts().cmdLocalPath || null
        process.env.KERORO_CLI_CMD_LOCAL_PATH = cmdLocalPath
    })

    // Listen for --debug option
    program.on('option:debug', function () {
        const options = this.opts()
        process.env.KERORO_CLI_LOG_LEVEL = options.debug ? 'debug' : 'info'
        logger.level = process.env.KERORO_CLI_LOG_LEVEL
    })

    // Listen for unknown commands
    program.on('command:*', (commands) => {
        logger.error('Unknown command:', commands[0])
        program.outputHelp()
    })

    program.parse(process.argv)

    if (program.args.length < 1) {
        program.outputHelp()
    }
}

module.exports = entry
