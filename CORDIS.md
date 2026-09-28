# Deepseek-harness-Cordis

这里统一维护 Missher 当前使用的 DSH 桌面源码和四个公开插件。宿主保留上游目录结构，插件保留独立包、配置、构建与卸载能力；克隆本仓库即可取得这五部分源码。

## 源码入口

| 功能 | 维护位置 |
| --- | --- |
| 桌面程序、公共接口、图片附件、输入框插件引用、模型能力设置 | [apps/](apps/) 与 [packages/](packages/) |
| 上下文压缩和当前会话详情 | [plugins/dsh-context-manager](plugins/dsh-context-manager/) |
| 会话标识、跨会话投递、临时工作区 | [plugins/dsh-session-bridge](plugins/dsh-session-bridge/) |
| 助手输出布局、思考和工具展示 | [plugins/dsh-output-renderer](plugins/dsh-output-renderer/) |
| 跨会话用量、活动图和使用排行 | [plugins/dsh-usage-statistics](plugins/dsh-usage-statistics/) |

克隆与宿主构建沿用根 README 的源代码开发流程，但克隆地址使用本仓库。先在根目录安装依赖并构建宿主，再进入各插件目录安装开发依赖、构建和打包。各插件的 pnpm overrides 将开发 SDK 指向本仓库的匹配源码，不改变 package.json 中的运行依赖声明；`plugins/` 不加入宿主的 pnpm workspace，不会成为宿主的强制安装依赖。没有额外的兼容插件或兼容安装包。

## 独立项目

| 项目 | 可见性 | 原因 |
| --- | --- | --- |
| [Media@Missher](https://github.com/Missher12/media-missher) | 私有 | 用户指定；源码和数据不进入本仓库 |
| [dsh-reasoning-effort](https://github.com/Missher12/dsh-reasoning-effort) | 私有 | 用户再次确认继续私有；定制思考强度 UI 独立维护 |
| [MSE Learning](https://github.com/Missher12/mse-learning) | 公开 | 独立跨宿主学习产品；公开范围只包含独立产品导出 |

应用凭据、聊天记录、附件、生产 profile、本地安装备份和私有验收响应不属于公开源码。仓库导航只记录上述项目地址，不下载或内嵌私有内容。

## 仓库分工

`cordis-repositories.json` 记录当前包与导入基线。四个旧插件仓库保留原提交历史和旧下载地址，迁移后作为只读历史入口；后续源码修改集中在本仓库。旧本地目录仍可能被已安装插件引用，不能因 Git 归档而删除或移动它们。

[deepseek-harness](https://github.com/Missher12/deepseek-harness) 保留为官方仓库 fork 和上游协作入口。[deepseek-harness-desktop](https://github.com/Missher12/deepseek-harness-desktop) 保存旧版跨平台桌面产品，并有尚未合并的工作；不将它的全部分支当作重复代码删除。旧增强包、记忆、飞书和项目管理插件有独立内容，未经过迁移验收的仓库继续保留。

统一仓库保留宿主原有 Git 历史，四个插件的导入提交和历史仓库在清单中对应。原仓库与本地工作树都保留；不重写或强推它们的历史。

## 验证范围

本次整理的业务源码来自已完成四项功能及 Intel DSH 安装验收的本地版本。整理检查覆盖文件导入、私有项目排除、凭据扫描和新目录下的构建检查；业务与安装验收的日期和层级分别记录，不能用源码发布代替新的原生安装或真实模型验收。

当前安装过的 Intel 应用、插件 tarball 和日常 profile 不随 Git 整理替换。Windows、Linux 和真实供应商调用未因本次整理获得新的验收结论。导入的五份插件及研究 README 保留原语言，列在翻译配对清单的精确文件例外中；宿主和新导航页仍接受原有双语检查。历史兼容与验证记录允许保留精确提交号，例外限定在指定记录文件，普通源码和使用说明继续接受原有引用检查。各插件的历史验证文档保留原日期；其中的旧路径和旧阶段授权属于历史记录，当前源码归属以本页为准。

许可证与作者归属保留在根 LICENSE、THIRD_PARTY_NOTICES.md 和各插件的许可证文件中。

2026-09-28 的整合验证已在新目录完成宿主与 Client 类型检查、构建、本机原生依赖和 Web 构建。四个插件分别通过类型检查、构建及现有测试，共 149 项。使用统计的源码测试复用根 `vitest.shared.ts` 的装饰器转换器；先构建宿主原生依赖，才能运行需要真实会话文件锁的 Loader 测试。

`Cordis repository inventory` 工作流检查公开包清单和私有目录排除，不代表完整平台 CI。需要真实供应商凭据的 E2E 在本仓库仅允许手动触发，并要求 `CORDIS_RUN_LIVE_E2E=true`；保留原凭据预检，不将跳过的线上测试声称为通过。本轮未配置供应商密钥或执行付费模型请求。
