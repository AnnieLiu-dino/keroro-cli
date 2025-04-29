"use strict";

const path = require("path");
const child_process = require("child_process");
const { log } = require("@keroro-cli/utils");

const Package = require("../../package/lib");

// 配置表：key: 命令名称，value: npm包名称
const SETTING = {
  create: "@imooc-cli/init",
  // clone: "@keroro-cli/clone",
};
const CACHE_DIR = "dependencies/";

async function exec() {
  let targetPath = process.env.KERORO_CLI_TARGET_PATH;
  const envPath = process.env.KERORO_CLI_ENV_PATH;
  let storePath = "";
  let pkg;
  // this = clone command
  const commandName = this.name();
  const pkgName = SETTING[commandName];
  const pkgVersion = "latest";

  // 没有指定文件，就下载对应的 npm package
  if (!targetPath) {
    // 生成“缓存目录“的路径
    targetPath = path.resolve(envPath, CACHE_DIR);
    // 生成“缓存文件夹”的路径
    storePath = path.resolve(targetPath, "node_modules");
    log.verbose("targetPath", targetPath, "storePath", storePath);
    pkg = new Package({
      targetPath,
      storePath,
      name: pkgName,
      version: pkgVersion,
    });
    if (await pkg.exists()) {
      // 更新package
      pkg.update();
    } else {
      // 安装package
      await pkg.install();
    }
  } else {
    // 指定文件去执行
    pkg = new Package({ targetPath, name: pkgName, version: pkgVersion });
  }

  const entryFilePath = pkg.getEntryFilePath();
  log.verbose("entryFilePath", entryFilePath);
  if (entryFilePath) {
    try {
      // // 在当前进程中调用
      // // 将对象转数组 Array.from(arguments)
      // require(entryFile).call(null, Array.from(arguments))
      // // 在node 子进程中调用

      //使用多进程去执行
      const args = [commandName, this.opts()];
      log.verbose("args", args);
      // 1. 先将命令行参数转成字符串
      const exec_code = `require('${entryFilePath}').call(null, ${JSON.stringify(
        args
      )})`;
      log.verbose("exec_code", exec_code);

      const child = spawn(exec_code, {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      child.on("error", (e) => {
        console.log(e.message);
        // 结束
        process.exit(1);
      });
      child.on("exit", (code) => {
        log.verbose("命令执行结束", code);
      });
    } catch (e) {
      log.error(e.message);
    }
  }
}

function spawn(exec_code, options) {
  const isWin32 = process.platform === "win32";
  const command = isWin32 ? "cmd" : "node";
  const comnArgs = ["-e", exec_code];
  const args = isWin32 ? ["/c"].concat(comnArgs) : comnArgs;
  // 在window下应该是：child_process.spawn('cmd', ['/c', 'node','-e', exec_code], PS：window多个cmd的前缀
  // 在Mac下： child_process.spawn('node', ['-e', exec_code]
  log.verbose("执行命令：", command, args);
  const child = child_process.spawn(command, args, {
    ...options,
  });
  return child;
}

module.exports = exec;
