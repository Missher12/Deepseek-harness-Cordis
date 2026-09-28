# DSH 独立插件

[English](README.md) | 中文

这些插件在同一个 Git 仓库维护，各自构建、打包和安装。选择某个插件不会自动安装其余插件，也没有共同的兼容插件依赖。

| 插件 | 用途 | 入口 |
| --- | --- | --- |
| context-manager | 压缩与当前会话上下文详情 | [说明](dsh-context-manager/README.md) |
| session-bridge | 会话身份、跨会话通信和临时工作区 | [说明](dsh-session-bridge/README.md) |
| output-renderer | 助手输出、思考与工具展示 | [说明](dsh-output-renderer/README.md) |
| usage-statistics | 跨会话使用统计 | [说明](dsh-usage-statistics/README.md) |

包名和版本见各自 `package.json`。先完成根宿主依赖安装和构建，再在每个插件目录单独安装依赖并运行自己的构建命令；开发 SDK 通过该目录的 pnpm overrides 引用同仓库源码；发布前按该插件的检查说明验证完整 Host、Client 和配置入口，不把目录复制或存在 lib 当作安装生效。

私有插件及其他独立产品见 [仓库导航](../CORDIS.md)。
