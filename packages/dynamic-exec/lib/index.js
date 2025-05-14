'use strict'

const path = require('path')
const child_process = require('child_process')
const { log } = require('@keroro-cli/utils')
const Package = require('../../package/lib')

// 配置表：key: 命令名称，value: npm包名称
const SETTING = {
    create: '@keroro-cli/create',
}

async function exec() {
    const envPath = process.env.KERORO_CLI_ENV_PATH
    let storeDir = ''
    let pkg
    // this = clone command
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
        if (hasPkgInLocal) {
            await pkg.update()
        } else {
            await pkg.install()
        }
    } else {
        // 指定文件：cmdLocalPath 去执行
        pkg = new Package({
            execRootDir: process.env.KERORO_CLI_CMD_LOCAL_PATH,
            name: pkgName,
            version: pkgVersion,
        })
        console.log(pkg)
    }

    const pkgEntryFilePath = pkg.getEntryFilePath()
    log.info('entryFilePath', pkgEntryFilePath)
    if (pkgEntryFilePath) {
        try {
            // // 在当前进程中调用：无法充分利用cpu资源
            // // 将对象转数组 Array.from(arguments)
            // require(entryFile).call(null, Array.from(arguments))

            // 在node 子进程中调用，额外获得cpu资源
            //使用多进程去执行
            const options = this.opts()
            const args = [commandName, options]
            // 1. 先将命令行参数转成字符串
            const exec_code = `require('${pkgEntryFilePath}').call(null, ${JSON.stringify(
                args,
            )})`

            const child = spawn(exec_code, {
                cwd: process.cwd(),
                stdio: 'inherit', // pipe inherit ignore 的区别
            })
            // 2. 监听子进程的输出
            child.on('error', (e) => {
                log.error(e.message)
                // 结束
                process.exit(1)
            })
            // 3. 退出事件
            child.on('exit', (code) => {
                log.verbose('命令执行结束', code)
                process.exit(code)
            })
        } catch (e) {
            log.error(e.message)
        }
    }
}

// 兼容MAC和WINDOWS
function spawn(exec_code, options) {
    const isWin32 = process.platform === 'win32'
    const command = isWin32 ? 'cmd' : 'node'
    const comnArgs = ['-e', exec_code]
    const args = isWin32 ? ['/c'].concat(comnArgs) : comnArgs
    // window下：
    // child_process.spawn('cmd', ['/c', 'node','-e', exec_code], PS：window多个cmd的前缀

    // Mac下：
    // child_process.spawn('node', ['-e', exec_code]
    const child = child_process.spawn(command, args, {
        ...options,
    })
    return child
}

module.exports = exec
