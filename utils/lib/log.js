"use strict";

const npmlog = require("npmlog");
// 前缀
npmlog.heading = "keroro-cli";
// 前缀样式
npmlog.headingStyle = {
  bg: "blue",
};

// 判断环境变量 是否debug模式
npmlog.level = process.env.KERORO_CLI_LOG_LEVEL
  ? process.env.KERORO_CLI_LOG_LEVEL
  : "info";

// 自定义log命令：log.success('xxx')
npmlog.addLevel("success", 2000, { fg: "green", bold: true });

module.exports = npmlog;
