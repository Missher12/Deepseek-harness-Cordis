# 构建与打包 DSH 插件

[English](build-cordis-plugins.md) | 中文

[插件目录](../../plugins/README.zh.md) · [安装](install-cordis-plugins.zh.md)

每个插件均有独立仓库、包清单、锁文件与运行文件。宿主不强制依赖这些可选插件。

## 源码与 SDK

从插件目录克隆所选独立仓库。开发前先构建 [Missher DeepSeek Harness Desktop](https://github.com/Missher12/Missher-DeepseekHarness-Desktop)，再按插件 README 显式链接该 SDK。被 Git 忽略的 `harness-sdk` 链接代替对统一仓库相对目录的假设。

插件自己的 `package.json` 定义类型检查、构建和测试命令。`pnpm-workspace.yaml` 固定开发用 SDK 链接；这些链接不进入运行包。保留已提交锁文件及插件指定的 pnpm 版本。

## 交付

独立 Git 仓库同时包含源码与已验收的 `lib` 构建文件。`GIT_DELIVERY.json` 记录来源基线、原安装包摘要及逐文件运行摘要；它只证明该次交付，不能代替后续修改的验证。

新交付在隔离目录构建和验证，然后打包到源码目录外。保留旧归档，在独立 profile 中试装；不要重建正在被日常应用链接的目录。

源码检查、Loader 安装、浏览器或原生界面、真实模型验收分别报告。修改前阅读对应独立仓库的 `AGENTS.md` 和包边界检查。
