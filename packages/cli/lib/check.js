'use strict'
const path = require('path')
const os = require('os')

const rootCheck = require('root-check')
const pathExists = require('path-exists').sync

const { logger, npmInfo } = require('@keroro-cli/utils')
const constant = require('./constant')
const userHomeDir = os.homedir()
class PreCheck {
    printVersion(pkg) {
        logger.success('version', pkg.version)
    }

    userAuth() {
        rootCheck()
    }

    // Check if user home directory exists
    userHome() {
        if (!userHomeDir || !pathExists(userHomeDir)) {
            throw new Error(`User home directory does not exist.`)
        }
    }

    // Load .env configuration into process.env
    checkEnv() {
        const envPath = path.resolve(userHomeDir, '.env')
        if (pathExists(envPath)) {
            const dotenv = require('dotenv')
            dotenv.config({ path: envPath })
        } else {
            logger.info('.env file not found at', envPath)
        }

        // Set default env path
        process.env.KERORO_CLI_ENV_PATH = path.join(
            userHomeDir,
            constant.KERORO_CLI_DEFAULT_ENV_FILENAME,
        )
    }

    async globalUpdate(pkg) {
        const { name, version } = pkg
        const isLatest = await npmInfo.isLatestVersion(name, version)

        if (!isLatest) {
            const latestVersion = await npmInfo.getNpmLatestVersionNum(name)
            logger.warn(`
A newer version of ${name} is available.
Current: ${version} → Latest: ${latestVersion}

To update, run:
  npm install -g ${name}@^${latestVersion}
  or
  yarn global add ${name}@^${latestVersion}`)
        }
    }
}

module.exports = new PreCheck()
