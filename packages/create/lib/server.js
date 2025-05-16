const { project_templates, component_templates } = require('./templates.json')
const getProjectTempaltes = async () => {
    // TODO: add api request
    return project_templates
}

const getComponentTempaltes = async () => {
    // TODO: add api request
    return component_templates
}

module.exports = {
    getProjectTempaltes,
    getComponentTempaltes,
}
