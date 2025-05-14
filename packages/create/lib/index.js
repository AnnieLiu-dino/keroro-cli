'use strict'
const path = require('path')
const fs = require('fs-extra')
const os = require('os')
const ejs = require('ejs')

const { logger } = require('@keroro-cli/utils')
const Command = require('@keroro-cli/command')
const Package = require('@keroro-cli/package')
const { spinner, utils } = require('@keroro-cli/utils')
const {
    askIsContinue,
    askIsClearDir,
    askProjectType,
    askProjectInfo,
} = require('./inquirer')

const { getProjectTempaltes, getComponentTempaltes } = require('./server')
const { stringify } = require('querystring')
const userHomeDir = os.homedir()

const WHITE_COMMAND = ['npm', 'yarn', 'cnpm']

function create(argv) {
    console.log('argv', argv)
    const instance = new CreateCommand(argv)
    return instance
}

class CreateCommand extends Command {
    templateInfo = {}
    force = false
    projectInfo = {}
    constructor(argv) {
        super(argv)
        // cwd/pwd 当前进程运行所在的文件夹，例如在：/annie/test 运行，结果是：/annie/test
        this.cwd = process.cwd() || path.resolve('.')
    }

    // 如果不实现initial，父类中会报错
    initial() {
        const { force } = this._options
        this.force = force
    }

    get projectTemplateChoices() {
        return this.projectTemplates.map((item) => ({
            value: item.npmName,
            name: item.name,
        }))
    }

    async execute() {
        try {
            // 1.准备阶段
            const result = await this._prepare()
            if (!result) {
                logger.info('创建项目终止')
                return
            }
            // 2.下载模版
            await this._downloadTemplate()
            // 3.安装模版
            await this._installTemplate()
        } catch (e) {
            logger.error(
                'has error happend in execute stage for command-create',
                e.message,
            )
        }
    }

    async _prepare() {
        // 0、判断项目模版是否存在
        const projectTemplates = await getProjectTempaltes()
        console.log('project', projectTemplates)
        // TODO: 组件逻辑
        const componentTemplates = await getComponentTempaltes()

        this.projectTemplates = projectTemplates
        if (!projectTemplates || projectTemplates.length === 0) {
            throw new Error('项目模版不存在')
        }
        // 1、判断当前目录是否为空
        // 如果目录里只有 .文件 和 node_modules 目录，算是空目录
        const isDirEmpty = this._isDirEmpty()
        logger.info(this.constructor.name, '当前执行目录是否为空', isDirEmpty)
        let isContinue = false
        // 若是 force：false，询问用户是否继续创建项目
        // 若是 force：true，无需在过问那么多条件

        // 非空就要去询问用户操作
        if (!isDirEmpty) {
            if (!this.force) {
                // 询问是否创建
                isContinue = await askIsContinue()
                if (!isContinue) {
                    return
                }
            }
            if (isContinue || this.force) {
                // 2、是否启动强制更新
                const isClearDir = await askIsClearDir()
                if (isClearDir) fs.emptyDirSync(this.cwd)
            }
        }
        // 3、选择创建项目/组件
        // 4、获取项目基本信息
        const projectInfo = await this.getProjectInfo()
        return projectInfo
    }

    async getProjectInfo() {
        let projectInfo = {}
        // 3、选择创建项目/组件
        const projectType = await askProjectType()
        switch (projectType) {
            case 'project':
                // 4、获取项目的基本信息
                const info = await askProjectInfo(this.projectTemplateChoices)
                projectInfo = {
                    projectType,
                    ...info,
                }
                this.projectInfo = projectInfo
                break
            case 'component':
                break
        }
        return this.projectInfo
    }

    _isDirEmpty() {
        logger.info(this.constructor.name, '当前的执行目录', this.cwd)
        // 读出所有的文件列表
        let fileList = fs.readdirSync(this.cwd)
        fileList = fileList.filter((filename) => {
            // 过滤掉隐藏文件和node_modules
            return (
                !filename.startsWith('.') &&
                ['node_modules'].indexOf(filename) < 0
            )
        })

        return fileList.length === 0
    }

    // 先把文件下载到缓存目录
    async _downloadTemplate() {
        // 在缓存目录下创建template文件夹
        const targetPath = path.resolve(userHomeDir, '.keroro-cli', 'templates')
        const storeDir = path.resolve(targetPath, 'node_modules')
        const { projectTemplateName } = this.projectInfo
        this.templateInfo = this.projectTemplates.find(
            (item) => item.npmName === projectTemplateName,
        )
        const { npmName, version } = this.templateInfo

        this.templateNpmPkg = new Package({
            targetPath,
            storeDir,
            name: npmName,
            version,
        })
        logger.info('this.templateNpmPkg', JSON.stringify(this.templateNpmPkg))

        let cli_spinner

        // 看要下载的npm是否存在
        const existPkg = await this.templateNpmPkg.exists()
        logger.info('existPkg', existPkg)

        if (!existPkg) {
            try {
                cli_spinner = spinner.start('正在下载模版...')
                // 让动画执行 1s
                await utils.sleep(1000)
                await this.templateNpmPkg.install()
            } catch (e) {
                console.error(e.message)
                throw new Error(e.message)
            } finally {
                spinner.stop(cli_spinner)
                if (await this.templateNpmPkg.exists()) {
                    logger.success('下载模版成功')
                }
            }
        } else {
            try {
                cli_spinner = spinner.start('正在更新模版...')
                await utils.sleep(1000)
                await this.templateNpmPkg.update()
            } catch (e) {
                console.error(e.message)
                throw new Error(e.message)
            } finally {
                spinner.stop(cli_spinner)
                logger.success('更新模版成功')
            }
        }
    }

    // 将已经缓存的模版进行安装
    async _installTemplate() {
        if (!this.templateInfo) throw new Error('没有模版信息，try again')
        const { type = 'normal', npmName, version } = this.templateInfo
        await this._installNormalTemplate()
    }
    // 添加白名单
    checkCommand(command) {
        if (WHITE_COMMAND.indexOf(command) >= 0) {
            return command
        }
        return null
    }

    async execCommand(command, errMsg) {
        if (!command) throw new Error('command')
        const script = command.split(' ')
        const cmd = this.checkCommand(script[0])
        if (!cmd) throw new Error(`命令不存在 ${cmd}`)

        const args = script.slice(1)
        try {
            const res = await utils.execAsync(cmd, args, {
                stdio: 'inherit',
                cwd: process.cwd(),
            })
            if (res !== 0) {
                throw new Error(errMsg)
            }
        } catch (e) {
            logger.error(e.message)
        }
    }

    async _installNormalTemplate() {
        console.log('_installNormalTemplate', this.templateNpmPkg.cacheFilePath)
        // 安装模版
        const cli_spinner = spinner.start('正在安装模版...')
        try {
            // 缓存下来的模版的路径
            const templatePath = path.resolve(
                this.templateNpmPkg.cacheFilePath,
                'template',
            )
            // 拷贝模版代码到当前目录
            const targetPath = this.cwd
            logger.info('templatePath', templatePath, 'targetPath', targetPath)
            // 如果路径不存在，ensureDirSync 会自动递归创建目录（包括上层不存在的目录）。
            fs.ensureDirSync(templatePath)
            fs.ensureDirSync(targetPath)
            // 拷贝模版到当前路径下
            fs.copySync(templatePath, targetPath)
        } catch (error) {
            console.error(error.message)
        } finally {
            spinner.stop(cli_spinner)
            logger.success('模版安装成功')
        }

        const ignore = ['node_modules/**', 'public/**', 'src/assets/**']
        await this.ejsRender({ ignore })

        const {
            command: { install, start },
        } = this.templateInfo
        console.log(install, start)
        // 依赖安装
        await this.execCommand(install, '依赖安装过程失败')
        logger.success('安装依赖成功，进入启动环节')
        // 启动命令执行
        await this.execCommand(start, '启动命令失败')
    }

    async _installCustomTemplate() {
        console.log(this.templateInfo)
    }

    async ejsRender(option) {
        console.log('this.projectInfo', this.projectInfo)
        const { projectName, projectVersion } = this.projectInfo
        // <%= app.name%>
        const tempalteData = {
            app: { name: projectName, version: projectVersion },
        }
        const { ignore } = option
        const dir = process.cwd()
        return new Promise((resolve, reject) => {
            require('glob')(
                '**',
                {
                    cwd: dir,
                    nodir: true,
                    ignore,
                },
                (err, files) => {
                    if (err) {
                        reject(err)
                    }
                    Promise.all(
                        files.map((file) => {
                            // 对文件进行 render
                            const filePath = path.join(dir, file)
                            return new Promise((resolve1, reject1) => {
                                ejs.renderFile(
                                    filePath,
                                    tempalteData,
                                    {},
                                    (err, res) => {
                                        if (err) {
                                            console.error(
                                                'filePath',
                                                filePath,
                                                err.message,
                                            )
                                            reject1(err)
                                        } else {
                                            // renderFile 不会真正去修改文件，会返回修改过后的字符串
                                            // 拿到结果，重新写入
                                            fs.writeFileSync(filePath, res)
                                            resolve1(res)
                                        }
                                    },
                                )
                            })
                        }),
                    )
                        .then(() => {
                            resolve()
                        })
                        .catch((err) => {
                            console.error(err.message)
                        })
                },
            )
        })
    }
}

module.exports = create
