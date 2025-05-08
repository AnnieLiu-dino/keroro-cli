const inquirer = require('inquirer')
const semver = require('semver')

const askIsContinue = async () => {
    const { isContinue } = await inquirer.prompt({
        name: 'isContinue',
        type: 'confirm',
        message: '当前文件夹非空，是否继续创建项目？',
        default: false,
    })
    return isContinue
}

const askIsClearDir = async () => {
    const { isClear } = await inquirer.prompt([
        {
            name: 'isClear',
            type: 'confirm',
            message: '当前执行目录非空，是否清空所有文件？',
            default: false,
        },
    ])
    return isClear
}

const askProjectType = async () => {
    const { type } = await inquirer.prompt({
        name: 'type',
        type: 'list',
        message: '选择初始化项目类型',
        choices: [
            { name: 'project', type: 'PROJECT' },
            { name: 'component', type: 'COMPONENT' },
        ],
    })
    return type
}

const askProjectInfo = async (templateChoices) => {
    const projectInfo = await inquirer.prompt([
        {
            type: 'input',
            message: '请输入项目名称',
            name: 'projectName',
            default: 'project-name',
            // 校验逻辑判断
            validate: function (v) {
                // 1. 输入的首字符必须为英文字符
                // 2. 尾字符必须为英文或者数字
                // 3. 字符只允许"-_"
                const done = this.async()
                setTimeout(function () {
                    if (
                        !/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
                            v,
                        )
                    ) {
                        done('请输入合法的项目名称')
                        return
                    }
                    done(null, true)
                }, 0)
            },
            filter: function (v) {
                return v
            },
        },
        {
            type: 'input',
            name: 'projectVersion',
            message: '请输入项目版本号',
            default: '1.0.0',
            validate: function (v) {
                const done = this.async()
                setTimeout(function () {
                    if (!!!semver.valid(v)) {
                        done('请输入合法的项目名称')
                        return
                    }
                    done(null, true)
                }, 0)
            },
            filter: function (v) {
                if (!!semver.valid(v)) {
                    return semver.valid(v)
                } else {
                    return v
                }
            },
        },
        {
            type: 'list',
            name: 'projectTemplateName',
            message: '请选择项目模版',
            choices: templateChoices,
        },
    ])
    return projectInfo
}

module.exports = {
    askIsContinue,
    askIsClearDir,
    askProjectType,
    askProjectInfo,
}
