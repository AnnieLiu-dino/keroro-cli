'use strict'
const path = require('path')

const pkgDir = require('pkg-dir').sync
const npminstall = require('npminstall')
const pathExists = require('path-exists')
const fsExtra = require('fs-extra')

const { log, npmInfo, utils } = require('@keroro-cli/utils')
class Package {
    // 包的信息
    pkgName = null
    pkgVersion = null
    // package的路径
    targetPath = null
    // package的存储路径:缓存在本地的一个路径
    storePath = null

    constructor(options) {
        if (!options || !utils.isObject(options)) {
            throw new Error('Package constructor has error')
        }
        const { targetPath, storePath, name, version } = options
        this.targetPath = targetPath
        this.storePath = storePath
        this.pkgName = name
        this.pkgVersion = version
    }
    // 获取指定路径下 package.json中入口文件的地址
    // eg: /.keroro-cli/dependencies/node_modules/XXXXX/lib/index.js
    getRootFile(targetPath) {
        // 1. 获取package.json所在目录
        const dir = pkgDir(targetPath)
        if (dir) {
            // 2. 读取package.json
            const pkgFile = require(path.resolve(dir, 'package.json'))
            // 3. 寻找main/lib
            if (pkgFile && pkgFile.main) {
                // 4. 路径的兼容(macOS/windows)
                const entryFilePath = utils.formatPath(
                    path.resolve(dir, pkgFile.main),
                )
                log.module('entryFilePath', entryFilePath)
                return entryFilePath
            }
        }
        return null
    }

    // 获取入口文件路径(逐层向上查找package.json所在层级)
    // targetPath路径下的入口文件（一般是 package.json 里面 "main" 指向的 js 文件）
    getEntryFilePath() {
        // 如果有缓存文件夹，就去缓存文件夹去找执行文件
        if (this.storePath) {
            return this.getRootFile(this.cacheFilePath)
        } else {
            // 反之去找 指定文件夹中的入口文件, 进入本地调试模式
            return this.getRootFile(this.targetPath)
        }
    }

    get cacheFilePathPrefix() {
        return `${this.pkgName.replace('/', '_')}@${this.pkgVersion}`
    }

    get cacheFilePath() {
        const _p = path.resolve(
            this.storePath,
            `_${this.cacheFilePathPrefix}@${this.pkgName}`,
        )
        log.module('cacheFilePath', _p)
        // "/Users/liuyan/.keroro-cli/dependencies/node_modules/_@imooc-cli_init@1.0.1@@imooc-cli/init";
        return _p
    }

    // latest 转 具体版本号
    async prepare() {
        // 如果有storePath属性值，但是目录不存在，=》创建目录
        if (this.storePath && !pathExists(this.storePath)) {
            // mkdirp 是将路径上所有的文件都创建好
            fsExtra.mkdirpSync(this.storePath)
        }
        if (this.pkgVersion === 'latest') {
            this.pkgVersion = await npmInfo.getNpmLatestVersionNum(this.pkgName)
        }
    }

    // npm package 是否存在
    async exists() {
        // 如果缓存目录存在，去缓存目录里找
        if (this.storePath) {
            // get lastest version 安装的时候可以用latest，但是查询的时候是以npm-name@x.x.x去找的
            await this.prepare()
            return await pathExists(this.cacheFilePath)
        } else {
            return pathExists(this.targetPath)
        }
    }

    // 安装package
    async install() {
        // 异步
        await this.prepare()
        log.notice(`正在下载${this.pkgName}@${this.pkgVersion}`)
        return this.pureInstall(this.pkgName, this.pkgVersion)
    }

    // 最新版本若存在本地，对应的路径
    specifyVersionPkgCachePath(version) {
        const prefix = `${this.pkgName.replace('/', '_')}@${version}`
        const latestPkgPath = path.resolve(
            this.storePath,
            `_${prefix}@${this.pkgName}`,
        )
        return latestPkgPath
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
        const pkgCachePath = this.specifyVersionPkgCachePath(lastestVersion)
        const hasLatestPkg = await pathExists(pkgCachePath)
        if (hasLatestPkg) {
            log.notice(`当前已是最新版本：${this.pkgName}@${lastestVersion}`)
        } else {
            log.notice(`正在更新${this.pkgName}@${lastestVersion}`)
            await this.pureInstall(this.pkgName, lastestVersion)
        }
        this.pkgVersion = lastestVersion
    }

    async pureInstall(name, version) {
        log.module(
            'pureInstall',
            this.targetPath,
            this.storePath,
            name,
            version,
        )
        return npminstall({
            // 模块路径
            root: this.targetPath,
            storeDir: this.storePath,
            registry: npmInfo.getDefaultRegistry(true),
            pkgs: [{ name, version }],
        })
    }
}

module.exports = Package
