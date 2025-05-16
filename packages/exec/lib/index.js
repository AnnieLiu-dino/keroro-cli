'use strict'

const path = require('path')
const { logger, utils } = require('@keroro-cli/utils')
const Package = require('@keroro-cli/package')

// Command-to-package mapping: key = command name, value = npm package name
const commandMap = {
    create: '@keroro-cli/create',
}

async function exec() {
    const envPath = process.env.KERORO_CLI_ENV_PATH
    let pkg
    const commandName = this.name()
    const pkgName = commandMap[commandName]
    const pkgVersion = 'latest'

    // If no local command path is specified, install the corresponding npm package
    if (!process.env.KERORO_CLI_CMD_LOCAL_PATH) {
        const execRootDir = path.resolve(envPath, 'dependencies/')
        const storeDir = path.resolve(execRootDir, 'node_modules')

        pkg = new Package({
            execRootDir,
            storeDir,
            name: pkgName,
            version: pkgVersion,
        })

        const hasPkgInLocal = await pkg.exists()
        logger.info('Package exists locally:', hasPkgInLocal)

        if (hasPkgInLocal) {
            const needInstall = await pkg.update()
            if (needInstall) {
                logger.start('Installing dependencies...')
                await utils.execScript('npm', ['install'], {
                    cwd: pkg.cacheFilePath(),
                })
            }
        } else {
            try {
                logger.start('Installing package...')
                await pkg.install()
                await utils.execScript('npm', ['install'], {
                    cwd: pkg.cacheFilePath(),
                })
            } catch (e) {
                logger.error('Package installation failed:', e)
            }
        }
    } else {
        // If local command path is specified, use that
        pkg = new Package({
            execRootDir: process.env.KERORO_CLI_CMD_LOCAL_PATH,
            name: pkgName,
            version: pkgVersion,
        })
    }

    const pkgEntryFilePath = pkg.getEntryFilePath()
    logger.info('Package entry file path:', pkgEntryFilePath)

    if (pkgEntryFilePath) {
        try {
            const args = [commandName, this.opts()]
            const code = `require('${pkgEntryFilePath}').call(null, ${JSON.stringify(args)})`
            // Execute in a new Node.js subprocess
            await utils.execScript('node', ['-e', code])
        } catch (e) {
            logger.error('Failed to execute package:', e.message)
            process.exit(1)
        }
    }
}

module.exports = exec
