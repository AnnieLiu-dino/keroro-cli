"use strict";
/* KP: require 可加载的类型 .js/.json/.node
 **  .js 需要 module.exports = xx 或 exports.xx 输出模块
 **  json 通过JSON.parse
 **  其他文件，即使是 txt，同样作为js文件去解析，只要内部格式符合它编译需求 */
const path = require("path");

const commander = require("commander");
const semver = require("semver");
const colors = require("colors/safe");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;

const pkg = require("../package.json");
const constant = require("./constant");
const log = require("../../../utils/lib/log");
const dynamicExec = require("@keroro-cli/dynamic-exec");

const program = new commander.Command();

async function enrty() {
  prepare_stage();
  // commander脚手架初始化
  registerCommand();
}

async function prepare_stage() {
  try {
    const {
      pkgVersion,
      userAuth,
      userHome,
      checkEnv,
      globalUpdate,
    } = require("./check");
    pkgVersion(pkg);
    userAuth();
    userHome();
    checkEnv();
    // await globalUpdate(pkg);
  } catch (e) {
    log.error("prepare_stage", e.message);
  }
}

function registerCommand() {
  const cliName = Object.keys(pkg.bin)[0];
  // <> 代表必填参数 []可选项
  program
    .name(cliName)
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .option("-tp, --targetPath <targetPath>", "本地调试文件路径", "");

  const clone = program.command("clone <projectName>");
  clone
    .option("-f, --force", "是否强制")
    .description("clone a repo")
    .action(dynamicExec);

  // 监听全局参数:targetPath ->
  program.on("option:targetPath", function () {
    const targetPath = this.opts().targetPath || null;
    process.env.KERORO_CLI_TARGET_PATH = targetPath;
  });

  // 监听全局参数:debug事件
  program.on("option:debug", function () {
    // const options = program.opts();
    const options = this.opts();
    if (options.debug) {
      process.env.KERORO_CLI_LOG_LEVEL = "verbose";
    } else {
      process.env.KERORO_CLI_LOG_LEVEL = "info";
    }
    log.level = process.env.KERORO_CLI_LOG_LEVEL;
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

module.exports = enrty;
