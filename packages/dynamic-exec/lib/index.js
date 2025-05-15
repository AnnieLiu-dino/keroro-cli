'use strict'

const path = require('path')
const { logger, utils } = require('@keroro-cli/utils')
const Package = require('@keroro-cli/package')

// 配置表：key: 命令名称，value: npm包名称
const SETTING = {
    create: '@keroro-cli/create',
}

async function exec() {
    const envPath = process.env.KERORO_CLI_ENV_PATH
    let pkg
    // this = create command program
    const commandName = this.name()
    const pkgName = SETTING[commandName]
    const pkgVersion = 'latest'

    // 没有指定文件，就下载对应的 npm package
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
        logger.info('hasPkgInLocal', hasPkgInLocal)
        if (hasPkgInLocal) {
            await pkg.update()
        } else {
            try {
                await pkg.install()
                await utils.execScript('npm', ['install'], {
                    cwd: pkg.cacheFilePath(),
                })
            } catch (e) {
                logger.error(e)
            }
        }
    } else {
        // 指定文件：cmdLocalPath 去执行
        pkg = new Package({
            execRootDir: process.env.KERORO_CLI_CMD_LOCAL_PATH,
            name: pkgName,
            version: pkgVersion,
        })
    }

    const pkgEntryFilePath = pkg.getEntryFilePath()
    logger.info('entryFilePath', pkgEntryFilePath)
    if (pkgEntryFilePath) {
        try {
            const args = [commandName, this.opts()]
            // 1. 先将命令行参数转成字符串
            const code = `require('${pkgEntryFilePath}').call(null, ${JSON.stringify(
                args,
            )})`
            //使用多进程去执行
            await utils.execScript('node', ['-e', code])
        } catch (e) {
            logger.error(e.message)
            process.exit(1)
        }
    }
}

module.exports = exec
