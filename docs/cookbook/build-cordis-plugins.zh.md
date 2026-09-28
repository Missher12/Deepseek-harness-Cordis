# DSH 插件构建与打包

[English](build-cordis-plugins.md) | 中文

[插件目录](../../plugins/README.zh.md) · [安装](install-cordis-plugins.zh.md)

本教程从统一仓库生成可安装的压缩包。先构建宿主，再构建所需插件；插件包继续独立于宿主 workspace。

## 准备工作

先完成根目录的[源码准备](../../README.zh.md)，包括安装依赖与构建宿主。以下使用 macOS/Linux Shell 命令；Windows 开发环境参考[宿主开发指南](../development.zh.md)。

各插件的 `pnpm-workspace.yaml` 从同一 checkout 的 `../../packages/`、`../../vendor/` 解析开发 SDK，需要保留完整仓库结构。把插件单独搬出会破坏这些开发链接，安装后的压缩包不使用它们。包版本和脚本以各自的 `package.json` 为准，Bridge 也使用自己的 pnpm 版本。

## 构建一个插件

从仓库根目录开始执行：

```sh
cd plugins/dsh-output-renderer
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
pnpm test
```

维护其他插件时替换成[插件列表](../../plugins/README.zh.md#public-plugins)对应的目录。构建准备运行入口，测试与类型检查验证所选源码；这些命令不会把插件安装到 DSH。

## 一次打包四个插件

下面整段从仓库根目录执行，各插件分别检查与构建。压缩包输出到全新临时目录，避免覆盖此前交付。

```sh
(
  set -e
  cordis_artifacts="$(mktemp -d "${TMPDIR:-/tmp}/cordis-bundles.XXXXXX")"
  for cordis_plugin in dsh-context-manager dsh-session-bridge dsh-output-renderer dsh-usage-statistics; do
    (
      cd "plugins/$cordis_plugin"
      pnpm install --frozen-lockfile
      pnpm run typecheck
      pnpm run build
      pnpm test
      npm pack --ignore-scripts --pack-destination "$cordis_artifacts"
    )
  done
  printf '%s\n' "$cordis_artifacts"
)
```

只有四轮全部成功、输出目录包含四个 `.tgz` 才继续。`npm pack --ignore-scripts` 打包已有构建文件，本身不会构建。文件名由包名决定，带 scope 的包会带有 `missher-` 前缀。产物放在源码目录之外，并在清理临时文件前移到长期保存位置。

按[安装指南](install-cordis-plugins.zh.md)验证选定产物。各插件的包检查与历史证据分别见[上下文边界](../../plugins/dsh-context-manager/PLUGIN_BOUNDARIES.md)、[Bridge 边界](../../plugins/dsh-session-bridge/PLUGIN_BOUNDARIES.md)、[渲染验证](../../plugins/dsh-output-renderer/VALIDATION.md)与[统计验证](../../plugins/dsh-usage-statistics/VALIDATION.md)。

## 维护归属

公开插件改动统一落在本仓库的 `plugins/`。旧独立仓库保留历史提交与发布，旧本地目录仍可能被已安装插件引用，本流程不重建或搬移它们。源码归属和私有项目见 [CORDIS.md](../../CORDIS.md)。

交付前分别记录构建/类型检查、单元测试、包内容、真实 Loader 安装、界面检查和真实模型行为。在隔离 `DSH_HOME` 中测试，保留原安装包与数据，并遵循 [AGENTS.md](../../plugins/AGENTS.md) 及对应插件约束。安装到日常应用是独立操作。
