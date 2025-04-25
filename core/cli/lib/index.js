"use strict";
/* KP: require 可加载的类型 .js/.json/.node
 **  .js 需要 module.exports = xx 或 exports.xx 输出模块
 **  json 通过JSON.parse
 **  其他文件，即使是 txt，同样作为js文件去解析，只要内部格式符合它编译需求 */
const path = require("path");

const pkg = require("../package.json");
const constant = require("./const");

const log = require("@keroro-cli/log");
const commander = require("commander");
const semver = require("semver");
const colors = require("colors/safe");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;

const program = new commander.Command();

async function enrty() {
  try {
    checkPkgVersion();
    checkNodeVersion();
    checkRoot();
    checkUserHome();
    checkEnv();
    // await checkGlobalUpdate();
    registerCommand();
  } catch (e) {
    log.error(e.message);
  }
}

function registerCommand() {
  const cliName = Object.keys(pkg.bin)[0];
  program
    .name(cliName)
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-D, --debug", "是否开启调试模式", false)
    .option("-E, --env <envname>", "环境变量");

  // <> 代表必填参数 []可选项
  const clone = program.command("clone <source> [destination]");
  clone
    .option("-f, --force", "是否强制")
    .option("-d, --debug", "是否强制")
    .description("clone a repo")
    .action((source, destination, options) => {
      log.verbose("clone action:", source, destination, options);
    });

  // 监听debug事件
  program.on("option:debug", function () {
    // const options = program.opts();
    const options = this.opts();
    if (options.debug) {
      process.env.LOG_LEVEL = "verbose";
    } else {
      process.env.LOG_LEVEL = "info";
    }
    log.level = process.env.LOG_LEVEL;
  });

  // 对未知命令的监听
  program.on("command:*", (commands) => {
    const availableCommands = program.commands.map((command) => command.name());
    console.log(availableCommands);
    console.error("found unknow command:", commands[0]);
    program.outputHelp();
  });

  program.parse(process.argv);
  // console.log(program);
  if (program.args && program.args.length < 1) {
    program.outputHelp();
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
    const config = createDefaultConfig();
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
  };
}

async function checkGlobalUpdate() {
  const { name, version } = pkg;
  // 调取 npm API，获取所有版本号
  const {
    isLatestVersion,
    getNpmLatestVersion,
  } = require("@keroro-cli/npm-info");
  // 提取所有版本号，比对那些版本号是大于当前版本号
  const isLatest = await isLatestVersion(name, version);
  if (!isLatest) {
    const latestVersion = await getNpmLatestVersion(name, version);
    log.warn(
      colors.yellow(`
        建议安装最新版本
        npm install ${name}@^${latestVersion} -g
        yarn global add ${name}@^${latestVersion}`)
    );
  }
}

module.exports = enrty;
