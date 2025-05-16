'use strict'

const semver = require('semver')
const { logger } = require('@keroro-cli/utils')

const LOWEST_NODE_VERSION = '14.0.0'

class Command {
    _argv
    _commandName
    _commandOptions

    constructor(argv) {
        if (!argv) throw new Error('Arguments cannot be null or undefined.')
        if (!Array.isArray(argv)) throw new Error('Arguments must be an array.')
        if (argv.length < 1)
            throw new Error('Arguments array must not be empty.')
        this._argv = argv
    }

    async run() {
        try {
            this.checkNodeVersion()
            this.initArgs()
            await this.initial()
            await this.execute()
        } catch (e) {
            logger.error(e.message)
            process.exit(1)
        }
    }

    checkNodeVersion() {
        // Get current Node.js version
        const currentVersion = process.version
        // Compare with the minimum required version
        if (!semver.gte(currentVersion, LOWEST_NODE_VERSION)) {
            throw new Error(
                `Node.js version must be >= ${LOWEST_NODE_VERSION}. Current version: ${currentVersion}`,
            )
        }
    }

    // Initialize command arguments
    initArgs() {
        this._commandName = this._argv[0]
        this._commandOptions = this._argv.slice(1)
        logger.debug('Command name:', this._commandName)
        logger.debug('Command options:', this._commandOptions)
    }

    // To be implemented by subclass
    async initial() {
        throw new Error(
            'The "initial" method must be implemented in the subclass.',
        )
    }

    // To be implemented by subclass
    async execute() {
        throw new Error(
            'The "execute" method must be implemented in the subclass.',
        )
    }
}

module.exports = Command
