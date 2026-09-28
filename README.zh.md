# Deepseek-harness-Cordis

[English](README.md) | 中文

这里统一维护 Missher 的 DSH 桌面程序源码和四个可独立安装的插件。可直接进入[插件目录](plugins/README.zh.md)、[安装指南](docs/cookbook/install-cordis-plugins.zh.md)或[插件开发指南](docs/cookbook/build-cordis-plugins.zh.md)。

本项目基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，该项目由 [DeepSeek AI](https://deepseek.com) 开发。这里沿用由 [Cordis](https://github.com/cordiverse/cordis) 支持的**一切皆插件**架构，保留上游作者归属、历史与许可证。本仓库和原项目的关系见[仓库分工](CORDIS.md)。

## 快捷入口

| 我想做什么 | 打开这里 |
| --- | --- |
| 查看或压缩当前会话的上下文 | [上下文管理](plugins/dsh-context-manager/README.md) |
| 查看跨会话用量与排行 | [使用统计](plugins/dsh-usage-statistics/README.md) |
| 调整助手输出、思考与工具布局 | [输出外观](plugins/dsh-output-renderer/README.md) |
| 复制会话 ID、跨会话投递或使用临时工作区 | [会话桥接](plugins/dsh-session-bridge/README.md) |
| 安装、升级或卸载插件 | [安装指南](docs/cookbook/install-cordis-plugins.zh.md) |
| 构建、测试或打包插件 | [开发指南](docs/cookbook/build-cordis-plugins.zh.md) |
| 查找私有插件或 MSE Learning | [独立项目](CORDIS.md#独立项目) |

每个插件均可单独选择和卸载。克隆仓库不会自动把插件安装或启用到 DSH；[插件目录](plugins/README.zh.md)列出了对应源码、说明和应用内入口。

<a id="run"></a>

<a id="run-from-source"></a>

## 运行本仓库源码

使用 [package.json](package.json) 声明的 Node.js `^22.19.0 || >=24.0.0` 和 pnpm `11.7.0`。运行前阅读[安全说明](SAFETY.zh.md)；Harness 仍处于开发者预览阶段，接口可能出现不兼容变更。

```sh
git clone https://github.com/Missher12/Deepseek-harness-Cordis.git
cd Deepseek-harness-Cordis
pnpm install --frozen-lockfile
pnpm run build
pnpm dsh web
```

Web UI 通常在 `http://127.0.0.1:3080` 打开。与已有安装并行开发时，使用[隔离 profile 流程](docs/cookbook/install-cordis-plugins.zh.md#cli-web)。根目录构建准备宿主，各可选插件另有自己的[构建和打包步骤](docs/cookbook/build-cordis-plugins.zh.md)。

`npx @deepseek-ai/dsh web` 运行的是上游发布的包，不会选用本 checkout，也不包含这里的四个定制插件。本仓库提供源码，安装时按指南使用已构建目录或本地生成的压缩包。

## 文档与参与维护

- [插件导航](plugins/README.zh.md)：源码、使用说明和应用内入口。
- [开发指南](docs/development.zh.md)、[架构](docs/architecture.zh.md)和[贡献指南](CONTRIBUTING.zh.md)：宿主开发与审查。
- [Web UI 指南](docs/user/guide/index.zh.md)：Harness 日常使用。
- [CORDIS.md](CORDIS.md)：源码归属、私有项目、历史仓库和验证范围。
- [问题反馈](https://github.com/Missher12/Deepseek-harness-Cordis/issues)：报告本仓库问题时，附上宿主与插件版本、复现步骤及已脱敏错误。
- [上游文档](https://deepseek-harness.github.io/deepseek-harness/)和[上游讨论](https://github.com/deepseek-ai/deepseek-harness/discussions)：官方 Harness 文档与社区。

开发助手遵循 [AGENTS.md](AGENTS.md) 与各插件自己的约束。源码发布、测试通过、安装生效和真实模型验证是不同结果，实际验证层级以各项目的验收记录为准。

## 上游引用

Cordis 的设计参见 [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512)。原 Harness 项目引用格式如下：

```bibtex
@misc{deepseek-harness2026,
  title={DeepSeek Harness: Everything is a Plugin},
  author={DeepSeek-AI},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/deepseek-ai/deepseek-harness}},
}
```

## 许可证

[MIT](LICENSE)。第三方依赖及许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和各插件的许可证文件。
