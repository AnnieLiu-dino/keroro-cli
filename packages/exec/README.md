# `@keroro-cli/exec`

> TODO: description

## Usage

```
const dynamicExec = require('@keroro-cli/dynamic-exec');


步骤 | 动作
1 | 根据传入的 commandName（比如 clone），通过一个映射关系（map）找到对应的 npm package name。
2 | 如果有 targetPath（一般用于本地调试阶段），直接用本地路径的包执行。
3 | 如果没有 targetPath，就去本地缓存目录找（比如 ~/.keroro-cli/dependencies），找到后判断：- 有就更新到最新版本。- 没有就安装指定版本。
4 | 成功找到包的入口脚本（一般是 package.json 的 "main" 字段指向的文件），然后通过 Node 子进程执行，并且把 CLI 的参数传进去。


```
