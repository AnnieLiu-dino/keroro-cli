'use strict'
const path = require('path')

const pkgDir = require('pkg-dir').sync
const npminstall = require('npminstall')
const pathExists = require('path-exists')
const fsExtra = require('fs-extra')

const { log, npmInfo, utils } = require('@keroro-cli/utils')
class Package {
    constructor(options) {
        if (!options || !utils.isObject(options)) {
            throw new Error('Package的参数有问题')
        }
        const { execRootDir, storeDir, name, version } = options
        // package的路径
        this.execRootDir = execRootDir
        // package的存储路径:缓存在本地的一个路径
        this.storeDir = storeDir
        this.pkgName = name
        this.pkgVersion = version
    }

    async prepare() {
        // 如果有 storeDir 属性值，但是目录不存在，=》创建目录
        if (this.storeDir && !pathExists(this.storeDir)) {
            // mkdirp 是将路径上所有的文件都创建好
            fsExtra.mkdirpSync(this.storeDir)
        }
        if (this.pkgVersion === 'latest') {
            this.pkgVersion = await npmInfo.getNpmLatestVersionNum(this.pkgName)
        }
    }

    // 获取指定路径下 package.json中入口文件的地址
    // eg: /.keroro-cli/dependencies/node_modules/XXXXX/lib/index.js
    _getRootFile(dirPath) {
        // 1. 获取package.json所在目录
        const dir = pkgDir(dirPath)
        if (dir) {
            // 2. 读取package.json
            const pkgFile = require(path.resolve(dir, 'package.json'))
            // 3. 寻找main/lib
            if (pkgFile && pkgFile.main) {
                // 4. 路径的兼容(macOS/windows)
                const mainFilePath = utils.formatPath(
                    path.resolve(dir, pkgFile.main),
                )
                log.module('mainFilePath', mainFilePath)
                return mainFilePath
            }
        }
        return null
    }

    // 获取入口文件路径(逐层向上查找package.json所在层级)
    // execRootDir 路径下的入口文件（一般是 package.json 里面 "main" 指向的 js 文件）
    getEntryFilePath() {
        // 如果有缓存文件夹，就去缓存文件夹去找执行文件
        if (this.storeDir) {
            return this._getRootFile(this.cachePkgDir)
        } else {
            // 反之去找 指定文件夹中的入口文件, 进入本地调试模式
            return this._getRootFile(this.execRootDir)
        }
    }

    cacheFilePath(version) {
        const prefix = this.pkgName.replace('/', '_')
        const _path = path.resolve(
            this.storeDir,
            `_${prefix}@${version || this.pkgVersion}@${this.pkgName}`,
        )
        log.module('cacheFilePath', _p)
        return _path
    }

    // npm package 是否存在
    async exists() {
        // 如果缓存目录存在，去缓存目录里找
        if (this.storeDir) {
            // get lastest version 安装的时候可以用latest，但是查询的时候是以npm-name@x.x.x去找的
            await this.prepare()
            return await pathExists(this.cacheFilePath)
        } else {
            log.module('exists', 'this.storeDir 不存在')
            // return pathExists(this.execRootDir)
        }
    }

    // 安装package
    async install() {
        // 异步
        await this.prepare()
        log.notice(`正在下载${this.pkgName}@${this.pkgVersion}`)
        return await this.pureInstall(this.pkgName, this.pkgVersion)
    }

    // 更新package
    async update() {
        await this.prepare()
        // 判断最新版本是否存在
        // 1、查最新的版本号
        // 2、版本路径是否存在于本地
        const lastestVersion = await npmInfo.getNpmLatestVersionNum(
            this.pkgName,
        )
        log.info('lastestVersion', lastestVersion)
        const pkgCachePath = this.cacheFilePath(lastestVersion)
        const hasLatestPkg = await pathExists(pkgCachePath)
        log.info('hasLatestPkg', hasLatestPkg)

        if (hasLatestPkg) {
            log.notice(`当前已是最新版本：${this.pkgName}@${lastestVersion}`)
        } else {
            log.notice(`正在更新${this.pkgName}@${lastestVersion}`)
            await this.pureInstall(this.pkgName, lastestVersion)
        }
        this.pkgVersion = lastestVersion
    }

    async pureInstall(name, version) {
        return npminstall({
            // 模块路径
            root: this.execRootDir,
            storeDir: this.storeDir,
            registry: npmInfo.getDefaultRegistry(true),
            pkgs: [{ name, version }],
        })
    }
}

module.exports = Package
