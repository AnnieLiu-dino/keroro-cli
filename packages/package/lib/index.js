'use strict'

const path = require('path')
const pacote = require('pacote')
const pkgDir = require('pkg-dir').sync
const pathExists = require('path-exists')
const fsExtra = require('fs-extra')

const { logger, npmInfo, utils } = require('@keroro-cli/utils')

class Package {
    constructor(options) {
        if (!options || !utils.isObject(options)) {
            throw new Error('Invalid constructor parameters for Package')
        }
        const { execRootDir, storeDir, name, version } = options

        // Root directory where the package is executed
        this.execRootDir = execRootDir
        // Local cache directory for npm packages
        this.storeDir = storeDir
        this.pkgName = name
        this.pkgVersion = version
    }

    // Ensure the local directory exists, and fetch the latest version if needed
    async prepare() {
        if (this.storeDir && !pathExists(this.storeDir)) {
            fsExtra.mkdirpSync(this.storeDir)
        }

        if (this.pkgVersion === 'latest') {
            this.pkgVersion = await npmInfo.getNpmLatestVersionNum(this.pkgName)
        }
    }

    // Get the main entry file path from package.json
    _getRootFile(dirPath) {
        const dir = pkgDir(dirPath)
        logger.info('[Package] Located package root:', dir)

        if (dir) {
            const pkgFile = require(path.resolve(dir, 'package.json'))
            logger.info('[Package] package.json main field:', pkgFile.main)

            if (pkgFile && pkgFile.main) {
                const mainFilePath = utils.formatPath(
                    path.resolve(dir, pkgFile.main),
                )
                logger.info('[Package] Entry file path:', mainFilePath)
                return mainFilePath
            }
        }
        return null
    }

    // Get the path to the package's entry file
    getEntryFilePath() {
        logger.info(
            '[Package] getEntryFilePath: using storeDir =',
            this.storeDir,
        )

        if (this.storeDir) {
            logger.info('[Package] Searching in cache:', this.cacheFilePath())
            return this._getRootFile(this.cacheFilePath())
        } else {
            logger.info('[Package] Searching in exec root:', this.execRootDir)
            return this._getRootFile(this.execRootDir)
        }
    }

    // Get the expected cache path for the package
    cacheFilePath(version) {
        const prefix = this.pkgName.replace('/', '_')
        const resolvedPath = path.resolve(
            this.storeDir,
            `_${prefix}@${version || this.pkgVersion}@${this.pkgName}`,
        )
        logger.info('[Package] cacheFilePath:', resolvedPath)
        return resolvedPath
    }

    // Check if the package exists locally
    async exists() {
        if (this.storeDir) {
            await this.prepare()
            const exists = await pathExists(this.cacheFilePath())
            logger.info('[Package] Package exists locally:', exists)
            return exists
        }
        return false
    }

    // Install the package from npm
    async install() {
        await this.prepare()
        logger.start(`Installing ${this.pkgName}@${this.pkgVersion}...`)
        await this.pureInstall(this.pkgName, this.pkgVersion)
    }

    // Update the package to the latest version if it's not already cached
    async update() {
        await this.prepare()
        const latestVersion = await npmInfo.getNpmLatestVersionNum(this.pkgName)
        this.pkgVersion = latestVersion

        const latestPath = this.cacheFilePath(latestVersion)
        const hasLatest = await pathExists(latestPath)

        logger.info('[Package] Latest version:', latestVersion)
        logger.info('[Package] Exists in cache:', hasLatest)

        const label = `${this.pkgName}@${latestVersion}`

        if (hasLatest) {
            logger.success(`Already up to date: ${label}`)
            return false
        } else {
            logger.start(`Updating package: ${label}...`)
            await this.pureInstall(this.pkgName, latestVersion)
            return true
        }
    }

    // Actually extract the npm package to a local directory
    async pureInstall(name, version) {
        logger.info('[Package] Starting pureInstall')
        try {
            const spec = `${name}@${version}`
            const target = path.resolve(this.cacheFilePath(version))
            const opts = {
                registry: npmInfo.getDefaultRegistry(true),
            }

            logger.info('[Package] Extracting:', spec)
            logger.info('[Package] Target path:', target)

            await pacote.extract(spec, target, opts)
            return true
        } catch (err) {
            logger.error('[Package] Failed to extract package:', err.message)
            return false
        }
    }
}

module.exports = Package
