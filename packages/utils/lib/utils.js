const path = require('path')
const { spawn } = require('child_process')

// 兼容window/mac的路径: 保证路径里都是 /
function formatPath(_path) {
    if (_path && typeof _path === 'string') {
        // path.sep 是 Node.js 提供的路径分隔符：
        // 在 Linux/macOS 上是 / ; 在 Windows 上是 \
        const sep = path.sep
        // mac
        if (sep === '/') return _path
        // window 的连接符替换
        return _path.replace(/\\/g, '/')
    } else {
        throw new Error('formatPath 参数格式错误')
    }
}

function isObject(o) {
    return Object.prototype.toString.call(o) === '[object Object]'
}

function sleep(ms = 1000) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function execScript(command, args = [], options = {}) {
    const isWin32 = process.platform === 'win32'
    const cmd = isWin32 ? 'cmd' : command
    const cmdArgs = isWin32 ? ['/c', command, ...args] : args

    // spawn('npm', ['install'], { cwd: '目标路径' })
    // spawn('cmd', ['/c', 'npm', 'install'], { cwd: '目标路径' })

    // /c 表示执行完命令后关闭 shell。

    // spawn('cmd', ['/c', 'node', '-e', exec_code], PS：window多个cmd的前缀
    // spawn('node', ['-e', exec_code]
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, cmdArgs, {
            cwd: options.cwd || process.cwd(),
            stdio: options.stdio || 'inherit', // 默认直接继承父进程输出
            shell: options.shell || false,
            env: Object.assign({}, process.env, options.env || {}),
        })

        child.on('error', (err) => {
            reject(err)
        })

        child.on('close', (code) => {
            if (code !== 0) {
                reject(
                    new Error(
                        `Command failed: ${command} ${args.join(' ')}\nExit code: ${code}`,
                    ),
                )
            } else {
                resolve(code)
            }
        })
    })
}

module.exports = {
    isObject,
    formatPath,
    sleep,
    execScript,
}
