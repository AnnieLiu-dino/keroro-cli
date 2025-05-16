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

    // Initialize CLI arguments
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
            logger.error('[CreateCommand]', e.message)
        }
    }

    async prepare() {
        // 1. Fetch available templates from the server
        const projectTemplates = await getProjectTempaltes()
        this.projectTemplates = projectTemplates
        if (!projectTemplates || projectTemplates.length === 0) {
            throw new Error('No project templates found.')
        }

        // 2. Check whether current working directory is empty
        const isDirEmpty = this._isDirEmpty()
        logger.info('[Prepare]', 'Is current directory empty:', isDirEmpty)

        let isContinue = false
        if (!isDirEmpty) {
            if (!this.force) {
                isContinue = await askIsContinue()
                if (!isContinue) process.exit(1)
            }

            if (isContinue || this.force) {
                const isClearDir = await askIsClearDir()
                if (isClearDir) fs.emptyDirSync(this.cwd)
            }
        }

        // 3. Select project type and gather project metadata
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
        const projectType = await askProjectType()

        switch (projectType) {
            case 'project':
                const info = await askProjectInfo(this.projectTemplateChoices)
                userProjectInfo = {
                    projectType,
                    ...info,
                }
                this.userProjectInfo = userProjectInfo
                break
        }

        return this.userProjectInfo
    }

    _isDirEmpty() {
        let fileList = fs.readdirSync(this.cwd)
        fileList = fileList.filter(
            (filename) =>
                !filename.startsWith('.') && filename !== 'node_modules',
        )
        return fileList.length === 0
    }

    async downloadTemplate() {
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

        logger.info(
            '[Template]',
            'Package config:',
            JSON.stringify(this.templateNpmPkg),
        )

        const exists = await this.templateNpmPkg.exists()
        logger.info('[Template]', 'Template exists locally:', exists)

        if (!exists) {
            try {
                logger.start('Downloading template...')
                await this.templateNpmPkg.install()
            } catch (e) {
                throw new Error(`Template download failed: ${e.message}`)
            } finally {
                if (await this.templateNpmPkg.exists()) {
                    logger.success('Template downloaded successfully.')
                }
            }
        } else {
            try {
                logger.start('Checking for template updates...')
                await this.templateNpmPkg.update()
            } catch (e) {
                throw new Error(`Template update failed: ${e.message}`)
            }
        }
    }

    async installTemplate() {
        if (!this.templateInfo) {
            throw new Error(
                'No template information available. Please try again.',
            )
        }

        const { type = 'normal' } = this.templateInfo
        if (type === 'normal') {
            await this.installNormalTemplate()
        }
    }

    checkCommand(command) {
        return WHITE_COMMAND.includes(command) ? command : null
    }

    async execCommand(command, errMsg) {
        if (!command) throw new Error('Invalid command.')
        const [cmd, ...args] = command.split(' ')
        const safeCmd = this.checkCommand(cmd)
        if (!safeCmd) throw new Error(`Command not allowed: ${cmd}`)

        try {
            const res = await utils.execScript(safeCmd, args)
            if (res !== 0) {
                throw new Error(errMsg)
            }
        } catch (e) {
            logger.error(`[Command Execution] ${e.message}`)
        }
    }

    async installNormalTemplate() {
        const templatePath = path.resolve(
            this.templateNpmPkg.cacheFilePath(),
            'template',
        )
        const targetPath = this.cwd

        try {
            logger.start('Installing project template...')
            fs.ensureDirSync(templatePath)
            fs.ensureDirSync(targetPath)
            fs.copySync(templatePath, targetPath)
            logger.success('Template installed successfully.')
        } catch (error) {
            logger.error(`[Template Install] ${error.message}`)
        }

        const ignore = ['node_modules/**', 'public/**', 'src/assets/**']
        await this.ejsRender({ ignore })

        const {
            command: { install, start },
        } = this.templateInfo

        await this.execCommand(install, 'Dependency installation failed.')
        logger.success('Dependencies installed. Ready to start project...')
        await this.execCommand(start, 'Failed to run start script.')
    }

    async ejsRender(option) {
        const { projectName, projectVersion } = this.userProjectInfo
        const data = { app: { name: projectName, version: projectVersion } }
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
                    const rendered = await ejs.renderFile(filePath, data, {})
                    await fs.writeFile(filePath, rendered)
                } catch (err) {
                    logger.error('[EJS Render]', filePath, err.message)
                    throw err
                }
            }),
        )
    }
}

function create(argv) {
    console.log('[Create] CLI arguments:', argv)
    const instance = new CreateCommand(argv)
    instance.run()
    return instance
}

module.exports = create
