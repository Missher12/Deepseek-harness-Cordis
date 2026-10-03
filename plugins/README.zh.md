# DSH 插件目录

[English](README.md) | 中文

[仓库首页](../README.zh.md) · [安装](../docs/cookbook/install-cordis-plugins.zh.md) · [开发](../docs/cookbook/build-cordis-plugins.zh.md)

按需要解决的问题选择插件。这四个公开 Bundle 分别在独立 Git 仓库维护，各自构建、打包、保存设置和安装，无需额外搭配共同的兼容插件。

<a id="public-plugins"></a>

## 公开插件

| 插件 | 可以做什么 | DSH 内入口 | 快捷链接 |
| --- | --- | --- | --- |
| 上下文管理 | 请求前压缩、当前上下文、正文、逐次变化、本会话累计 | 会话 → 上下文；设置 → 上下文管理 | [说明](https://github.com/Missher12/Missher-DSH-Context-Manager/tree/main/README.md) · [源码](https://github.com/Missher12/Missher-DSH-Context-Manager/tree/main/src/) · [包信息](https://github.com/Missher12/Missher-DSH-Context-Manager/tree/main/package.json) |
| 使用统计 | 跨会话用量、活动图、模型/工具/技能排行 | 设置 → 使用统计 | [说明](https://github.com/Missher12/Missher-DSH-Usage-Statistics/tree/main/README.md) · [源码](https://github.com/Missher12/Missher-DSH-Usage-Statistics/tree/main/src/) · [包信息](https://github.com/Missher12/Missher-DSH-Usage-Statistics/tree/main/package.json) |
| 输出外观 | 三种单栏助手输出布局、完整思考、工具详情及流式动效 | 设置 → 输出外观 | [说明](https://github.com/Missher12/Missher-DSH-Output-Renderer/tree/main/README.md) · [源码](https://github.com/Missher12/Missher-DSH-Output-Renderer/tree/main/src/) · [包信息](https://github.com/Missher12/Missher-DSH-Output-Renderer/tree/main/package.json) |
| 会话桥接 | 会话 ID、跨会话投递与临时工作区 | 会话标题栏；新会话 → 工作区选择器 | [说明](https://github.com/Missher12/Missher-DSH-Session-Bridge/tree/main/README.md) · [源码](https://github.com/Missher12/Missher-DSH-Session-Bridge/tree/main/src/) · [包信息](https://github.com/Missher12/Missher-DSH-Session-Bridge/tree/main/package.json) |

包名和版本以链接中的 manifest 为准，[cordis-repositories.json](../cordis-repositories.json) 记录独立仓库清单。历史验证报告各有自己的日期和范围，不能直接当作新安装的通过证明。

## 需求归属

| 需求 | 负责人所在模块 |
| --- | --- |
| 图片上传与限额；输入框 `@插件` 引用 | 宿主[附件](../packages/attachment/)与[客户端](../packages/client/) |
| 模型设置中支持的思考档位 | 宿主[模型目录](../packages/client/ui-settings-models/) |
| 当前会话上下文与累计用量 | 上下文管理 |
| 跨会话累计用量 | 使用统计 |
| 助手输出外观 | 输出外观 |
| 会话身份、消息投递与临时工作区 | 会话桥接 |

输入框引用展示可调用的能力。只增加设置页或渲染功能的插件，安装后不会自动成为 `@` 命令。

## 独立项目

[Reasoning Effort](https://github.com/Missher12/Missher-DSH-Reasoning-Effort) 已公开，包含思考深度滑块与点阵设计。[Media@Missher](https://github.com/Missher12/Missher-Media) 继续私有，需要仓库访问权限。[MSE Learning](https://github.com/Missher12/Missher-MSE-Learning) 是独立公开产品。这些源码不包含在这里，具体见[归属与隐私边界](../CORDIS.md#独立项目)。

## 下一步

已有构建产物时按[安装指南](../docs/cookbook/install-cordis-plugins.zh.md)启用插件，需要生成安装包时按[开发指南](../docs/cookbook/build-cordis-plugins.zh.md)操作。后续插件开发在对应独立仓库进行；宿主仓库保留原导入历史。
