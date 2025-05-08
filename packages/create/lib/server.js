const { request } = require('@keroro-cli/utils')
const { project_templates, component_templates } = require('./templates.json')
const getProjectTempaltes = async () => {
    try {
        const res = await request({ url: '/project/templates' })
        return res
    } catch (e) {
        console.error(e.message)
        return project_templates
    }
}

const getComponentTempaltes = async () => {
    try {
        const res = await request({ url: '/component/templates' })
        return res
    } catch (e) {
        console.error(e.message)
        return component_templates
    }
}

module.exports = {
    getProjectTempaltes,
    getComponentTempaltes,
}
