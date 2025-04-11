"use strict";
/* KP: require 可加载的类型 .js/.json/.node
 **  .js 需要 module.exports = xx 或 exports.xx 输出模块
 **  json 通过JSON.parse
 **  其他文件，即使是 txt，同样作为js文件去解析，只要内部格式符合它编译需求 */
const path = require("path");

const pkg = require("../package.json");
const constant = require("./const");

const log = require("@keroro-cli/log");

const semver = require("semver");
const colors = require("colors/safe");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;

function enrty() {
  try {
    checkPkgVersion();
    checkNodeVersion();
    checkRoot();
    checkUserHome();
  } catch (e) {
    log.error(e.message);
  }
}

// 如果当前操作员是root，就要降级到普通用户。
function checkRoot() {
  /* KP: process.geteuid()可以获取当前用户的权限code，在MacOS下普通用户是501，管理员root是0；
   **  如果用户用 sudo 执行 CLI 脚本，而 CLI 中没有降级，然后用户下一次用普通权限去读写这些文件时，会出现“Permission denied”的问题 */
  // console.log("获取权限code",process.geteuid());
  require("root-check")();
}

function checkPkgVersion() {
  log.info("version: ", pkg.version);
}

// 低版本node不支持本库中使用的api，所有要进行检查
function checkNodeVersion() {
  const cur_v = process.version;
  const low_v = constant.LOWEST_NODE_VERSION;
  if (!semver.gte(cur_v, low_v)) {
    throw new Error(colors.red(`keroro-cli need node${low_v}`));
  }
}
// 确保用户主目录存在并且可访问，因为很多 CLI 工具会在用户主目录下创建配置文件、缓存、日志等。
function checkUserHome() {
  // console.log("主目录", userHome);
  /* KP: pathExists的原理使用：fs.accessSync(path); */
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("dont exist user home"));
  }
}
function checkEnv() {
  // process.cwd() 获得当前路径
  const dotenv = require("dotenv");
  // Default: path.resolve(process.cwd(), '.env') 默认是当前文件夹下的 .env文件
  // 主目录下如果有.env, 则拉取主目录下的.env; 反之创建默认
  const envPath = path.resolve(userHome, ".env");
  if (pathExists(envPath)) {
    // 使用 dotenv，从指定的路径 envPath 加载 .env 文件，把其中的变量加载到 process.env 中。
    // 之后通过可通过 process.env.XXX 访问
    dotenv.config({ path: envPath });
  } else {
    // this.config = this.createDefaultConfig();
  }
}
function createDefaultConfig() {
  // 若配置过cli文件，就去读。反之使用默认的
  const filename =
    process.env.CLI_ENV_FILENAME ?? constant.DEFAULT_CLI_ENV_FILENAME;
  const cliEnvPath = path.join(userHome, filename);
  process.env.CLI_ENV_PATH = cliEnvPath;
  return {
    home: userHome,
    cliHome,
  };
}

module.exports = enrty;
