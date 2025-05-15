'use strict'
const path = require('path')
const fs = require('fs-extra')
const os = require('os')
const ejs = require('ejs')
const { glob } = require('glob')

const { logger, utils } = require('@keroro-cli/utils')
const Command = require('@keroro-cli/command')
const Package = require('@keroro-cli/package')
const {
    askIsContinue,
    askIsClearDir,
    askProjectType,
    askProjectInfo,
} = require('./inquirer')

const { getProjectTempaltes } = require('./server')
const userHomeDir = os.homedir()

const WHITE_COMMAND = ['npm', 'yarn', 'cnpm']

class CreateCommand extends Command {
    templateInfo = {}
    force = false
    userProjectInfo = {}
    constructor(argv) {
        super(argv)
        this.cwd = process.cwd() || path.resolve('.')
    }

    // 如果不实现initial，父类中会报错
    initial() {
        const { force } = this._commandOptions
        this.force = force
    }

    async execute() {
        try {
            await this.prepare()
            await this.downloadTemplate()
            await this.installTemplate()
        } catch (e) {
            logger.error('CreateCommand', e.message)
        }
    }

    async prepare() {
        // 0、判断项目模版是否存在
        const projectTemplates = await getProjectTempaltes()
        this.projectTemplates = projectTemplates
        if (!projectTemplates || projectTemplates.length === 0) {
            throw new Error('项目模版不存在')
        }
        // 1、判断当前目录是否为空
        // 如果目录里只有 .文件 和 node_modules 目录，算是空目录
        const isDirEmpty = this._isDirEmpty()
        logger.info(this.constructor.name, '当前执行目录是否为空', isDirEmpty)

        let isContinue = false
        // 若是 force：false，询问用户是否继续创建项目; force：true，无需在过问那么多条件

        // 非空就要去询问用户操作
        if (!isDirEmpty) {
            if (!this.force) {
                // 询问是否创建
                isContinue = await askIsContinue()
                if (!isContinue) process.exit(1)
            }
            if (isContinue || this.force) {
                // 2、是否启动强制更新
                const isClearDir = await askIsClearDir()
                if (isClearDir) fs.emptyDirSync(this.cwd)
            }
        }
        // 3、选择创建项目
        // 4、获取用户项目基本信息
        const projectInfo = await this.getUserProjectInfo()
        return projectInfo
    }

    get projectTemplateChoices() {
        return this.projectTemplates.map((item) => ({
            value: item.npmName,
            name: item.name,
        }))
    }

    async getUserProjectInfo() {
        let userProjectInfo = {}
        // 3、选择创建项目/组件
        const projectType = await askProjectType()
        switch (projectType) {
            case 'project':
                // 4、获取项目的基本信息
                const info = await askProjectInfo(this.projectTemplateChoices)
                userProjectInfo = {
                    projectType,
                    ...info,
                }
                this.userProjectInfo = userProjectInfo
                break
            // case 'other':
            //     break
        }
        return this.userProjectInfo
    }

    _isDirEmpty() {
        // 读出所有的文件列表
        let fileList = fs.readdirSync(this.cwd)
        fileList = fileList.filter((filename) => {
            // 过滤掉 隐藏文件 和 node_modules
            return (
                !filename.startsWith('.') &&
                ['node_modules'].indexOf(filename) < 0
            )
        })

        return fileList.length === 0
    }

    // 先把文件下载到缓存目录
    async downloadTemplate() {
        // 在缓存目录下创建template文件夹
        const targetPath = path.resolve(userHomeDir, '.keroro-cli', 'templates')
        const storeDir = path.resolve(targetPath, 'node_modules')
        const { projectTemplateName } = this.userProjectInfo
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

        // 看要下载的npm是否存在
        const existPkg = await this.templateNpmPkg.exists()
        logger.info('existPkg', existPkg)

        if (!existPkg) {
            try {
                logger.start('正在下载模版...')
                await this.templateNpmPkg.install()
            } catch (e) {
                console.error(e.message)
                throw new Error(e.message)
            } finally {
                if (await this.templateNpmPkg.exists()) {
                    logger.success('下载模版成功')
                }
            }
        } else {
            try {
                logger.start('正在检查是否更新模版...')
                await this.templateNpmPkg.update()
            } catch (e) {
                logger.error(e.message)
                throw new Error(e.message)
            }
        }
    }

    // 将已经缓存的模版进行安装
    async installTemplate() {
        if (!this.templateInfo) throw new Error('没有模版信息，try again')
        const { type = 'normal', npmName, version } = this.templateInfo
        await this.installNormalTemplate()
    }
    // 添加白名单
    checkCommand(command) {
        if (WHITE_COMMAND.indexOf(command) >= 0) {
            return command
        }
        return null
    }

    async execCommand(command, errMsg) {
        if (!command) throw new Error('command 无效')
        const script = command.split(' ')
        const cmd = this.checkCommand(script[0])
        if (!cmd) throw new Error(`命令不存在 ${cmd}`)

        const args = script.slice(1)
        try {
            const res = await utils.execScript(cmd, args)
            if (res !== 0) {
                throw new Error(errMsg)
            }
        } catch (e) {
            logger.error(e.message)
        }
    }

    async installNormalTemplate() {
        logger.info(
            '_installNormalTemplate',
            this.templateNpmPkg.cacheFilePath(),
        )
        // 安装模版
        try {
            logger.start('正在安装模版...')
            // 缓存下来的模版的路径
            const templatePath = path.resolve(
                this.templateNpmPkg.cacheFilePath(),
                'template',
            )
            // 拷贝模版代码到当前目录
            const targetPath = this.cwd
            logger.info('templatePath', templatePath)
            logger.info('targetPath', targetPath)
            // 如果路径不存在，ensureDirSync 会自动递归创建目录（包括上层不存在的目录）。
            fs.ensureDirSync(templatePath)
            fs.ensureDirSync(targetPath)
            // 拷贝模版到当前路径下
            fs.copySync(templatePath, targetPath)
            logger.success('模版安装成功')
        } catch (error) {
            logger.error(error.message)
        }

        const ignore = ['node_modules/**', 'public/**', 'src/assets/**']
        await this.ejsRender({ ignore })

        const {
            command: { install, start },
        } = this.templateInfo
        console.log(install, start)
        // 依赖安装
        await this.execCommand(install, '依赖安装过程失败')
        logger.success('项目安装依赖成功，进入启动环节...')
        // 启动命令执行
        await this.execCommand(start, '启动命令失败')
    }

    async ejsRender(option) {
        const { projectName, projectVersion } = this.userProjectInfo
        // <%= app.name%>
        const tempalteData = {
            app: { name: projectName, version: projectVersion },
        }
        const { ignore } = option
        const cwd = process.cwd()

        const files = await glob('**', {
            cwd,
            nodir: true,
            ignore,
        })
        await Promise.all(
            files.map(async (filename) => {
                const filePath = path.join(cwd, filename)
                try {
                    const rendered = await ejs.renderFile(
                        filePath,
                        tempalteData,
                        {},
                    )
                    await fs.writeFile(filePath, rendered)
                } catch (err) {
                    logger.error('filePath', filePath, err.message)
                    throw err
                }
            }),
        )
    }
}

function create(argv) {
    console.log('argv', argv)
    const instance = new CreateCommand(argv)
    instance.run()
    return instance
}
module.exports = create
