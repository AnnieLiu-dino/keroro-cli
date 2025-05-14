'use strict'

const axios = require('axios')
const urlJoin = require('url-join')
const semver = require('semver')
const { logger } = require('./log')

const DEFAULT_REGISTRY = 'https://registry.npmjs.org'

function getDefaultRegistry() {
    return DEFAULT_REGISTRY
}
async function getNpmPkgInfo(npmName, registry = DEFAULT_REGISTRY) {
    if (!npmName) return null
    const domain = registry || getDefaultRegistry()
    // registry.npmjs.org/keroro-fe-template-nextjs
    const url = urlJoin(domain, npmName)
    try {
        const res = await axios.get(url)
        const { status, data } = res
        if (status === 200) {
            return data
        }
    } catch (e) {
        console.error(e.message)
        return null
    }
}

// ordered versions
async function getOrderedVersions(name, registry = DEFAULT_REGISTRY) {
    const pkgInfo = await getNpmPkgInfo(name, registry)
    if (!pkgInfo) {
        throw new Error(
            `Failed to fetch package info for "${name}" from ${registry}`,
        )
    }
    const { versions = {} } = pkgInfo
    const list = Object.keys(versions).sort((prev, next) =>
        semver.compare(next, prev),
    )
    return list
}

// 返回最新版本的具体版本号
async function getNpmLatestVersionNum(name, registry) {
    const versions = await getOrderedVersions(name, registry)
    return versions[0]
}

function getSemverVersions(baseVersion, versions) {
    versions = versions.filter((v) => semver.satisfies(v, `^${baseVersion}`))
    return versions
}

async function getNpmLatestVersion(name, version, registry) {
    const versions = await getOrderedVersions(name, registry)
    const satisfyVersions = getSemverVersions(version, versions)
    if (satisfyVersions && satisfyVersions.length > 0) {
        return satisfyVersions[0]
    }
    return '1.0.0'
}

async function isLatestVersion(name, version, registry) {
    const latestVersion = await getNpmLatestVersion(name, version, registry)
    if (version && semver.gt(latestVersion, version)) {
        return false
    }
    return true
}

module.exports = {
    getDefaultRegistry,
    getNpmPkgInfo,
    getNpmLatestVersion,
    getNpmLatestVersionNum,
    isLatestVersion,
}
