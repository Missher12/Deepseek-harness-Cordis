# 当前状态

## 2026-09-29：UI-04 仅改颗粒颜色

用户纠正后，撤销本轮重排，0.2.1-local.2 候选作废但保留。使用本轮开始时 before.patch 和 HEAD 恢复，65 个文件校验匹配；兼容升级脏工作保留。当前候选为 **0.2.1-local.3**，精确适配 DSH **0.2.0-rc.1**。

产品修改仅为 `src/client/charts.ts` 的颜色分档和原 CSS 的颗粒背景：零用量透明，有用量按单色五级从淡到深。原 53 × 7 颗粒布局、每周/累计堆叠高度、日期、提示、控件和月份标签保持；恢复原组件与语言文件的全部字节，没有图例、额外图表或操作说明。Host、缓存和数据口径不改。

在 `.verification/ui-20260929-color-only/candidate` 隔离完成类型、构建和 22 项相关测试。原版/改色版采用同一隔离 profile 的真实 Host 页面对照，具体完成情况和冻结包 SHA 以 `coordination/2026-09-29/ui-implementation/usage.md` 独占回执及 `verification/ui-20260929-color-only.json` 为准，不沿用作废候选的界面验收。日常安装由协调者接手，本会话不安装、不发布。

## 2026-09-29：DSH 0.2.0-rc.1 适配

需求 UPGRADE-20260929。唯一源码为 `/Users/missher/Documents/Projects/03-DeepSeek-Harness/源码仓库/Deepseek-harness-Cordis/plugins/dsh-usage-statistics`。统一仓库基线 HEAD `c7c457e5e07fa11a04bf8764d5f89585d789f258`；本插件开始时无本地修改。其他插件负责人的并行修改保留，不由本会话维护。旧 `Projects/04-Harness-Plugins/dsh-usage-statistics` 只作日常安装及历史入口，本轮不回写。

只读 SDK：`/Users/missher/Documents/Projects/03-DeepSeek-Harness/升级候选/cordis-0.2.0-rc.1-20260929`，同一整合 SHA；上游基线 `dsh-v0.2.0-rc.1` / `4878cdabd87d4041bdaff61d04c966883b9fd07a`。开发、安装验证均使用此已构建 SDK；CLI 安装调用 SDK 固定的 pnpm 11.7.0。

候选 **0.2.1-local.1** 将 DSH peer/dev 依赖精确对齐 0.2.0-rc.1。原统计、持久化读取、Typert 与设置页实现继续适用，`src/` 没有改动；缓存域版本 1、行格式版本 3、浏览器键 `dsh.usage-statistics.snapshot.v1` 保持不变。维护目录的 `lib/` 保留旧字节，本轮只能交付隔离构建的安装包。未改变 Cordis/Schemastery/Zod 版本，未添加兼容豁免或新插件依赖。

隔离候选位于本目录 `.verification/upgrade-020/candidate`，安装包为其 `dist/missher-dsh-usage-statistics-0.2.1-local.1.tgz`，校验值在同目录 `SHA256SUMS`。类型检查通过；61 项既有行为测试与 5 项新宿主准入测试分两组通过，共 66 项。实际 CLI tarball 安装、完整 Web profile Loader、Host 服务统计读取、重启、卸载和重装通过，合成会话文件与 v1/v3 缓存原始字节不变，统计值仍为 30,000 Token 和 76% 缓存命中率。

CUA/IAB 打开隔离 Host 返回 `net::ERR_BLOCKED_BY_CLIENT`，本会话停止浏览器尝试并关闭临时 Host。当前候选的真实页面、浏览器 RPC 与日常原生应用未在本会话验收，由前台协调会话继续；不运行 shell/Playwright CLI/CDP 浏览器绕过限制。组件和通信描述测试不能代替真实页面。未调用真实模型、改日常 profile、安装或重启日常应用，也未执行 Git 暂存、提交、推送或发布。

当前验证分层见 [VALIDATION.md](VALIDATION.md)；机器可读回执为 `verification/upgrade-020.json`。本轮独占协调回执：`/Users/missher/Documents/Deepseek-harness-Cordis/coordination/2026-09-29/upgrade-020/usage.md`。后面的 0.2.0 / 0.1.7-rc.2 记录均为历史事实，不作为当前候选的原生验收。

## 2026-09-28 职责审查（历史）

2026-09-28 协调审查：源码 HEAD `4058457826ca5c7f3a618ab82cff8a872bb74d1a`、版本 **0.2.0**，开始时工作树干净；本地 `origin/main` 也指向此 SHA，本轮未查询远端实时状态。职责为跨会话用量、活动、常用模型/推理强度与工具/技能排行；context-manager 本会话累计、REQ-02 模型能力设置和 REQ-03 详情展开不归本插件。具体口径见 README.md。

本轮在 `/private/tmp/dsh-usage-audit-20260928-j1i_ytlg/plugin` 隔离副本运行 aggregate / fold / service / snapshot-cache 四个已有测试文件，**40/40 通过**。仍通过宿主持久化服务读取，只写本插件派生缓存。仅纠正文档；未改 src/lib/manifest、未构建打包或安装、未触碰生产 profile、未重启应用、未执行 Git 暂存或发布操作。现有 lib 与 0.2.0 安装包、历史原生验收记录的入口哈希一致；这只是字节核对，不是本轮原生验收。独占回执见 `/Users/missher/Documents/Deepseek-harness-Cordis/coordination/2026-09-28/ui-usage.md`。

## 2026-09-26 兼容性修复与验收（历史）

用户在本地目录安装时，宿主报告 0.1.0 不兼容 DSH 0.1.7-rc.2。当时确认应用是用户 Applications 下的 DeepSeek Harness Intel 0.1.7-rc.2，插件升级为 **0.2.0**，精确适配此内核；0.1.0 安装包仍留在 dist，适配旧 Desktop 0.5.10 / DSH 0.1.5-rc.2。

开发依赖链接到已构建的 0.1.7-rc.2 源码，参考 SHA e3409377ac873963595b76c0eb9afd8a8aa241af；旧依赖链接备份在本仓库 .verification/node_modules-015rc2。不得修改宿主源码、日常数据或其他插件。本地根目录已通过图形界面安装验证；本段不声明远端发布现状。

插件拥有 usageStatistics Remote、usage.statistics Locale、missher_usage_statistics 派生缓存及 Client 入口。0.1.7-rc.2 没有内置使用统计，Bundle 只插入独立插件；卸载撤销入口。Client 必须 ctx.inject(['remote.usageStatistics'], ...)；新版 Typert codec 必须 create() 工厂，不能退回 schema 属性。所有宿主依赖使用匹配的 peer，不用版本豁免。

2026-09-26 验证：类型检查、64 项测试、目录与 tarball 的完整 CLI profile 安装/读取/卸载、原生目录安装/立即启用/统计图表/卸载均通过。实际验收运行时与当时应用的差异及验证限度见 VALIDATION.md、verification/runtime.json。原生脚本须使用尊重 DSH_HOME 的未包装参考应用；当时 Intel 启动包装会覆盖这个环境变量，不能直接拿它执行隔离测试。

脚本、报告和合成 V4 会话均在本仓库。截图不代表日常用量。运行时代码的校验值在 verification/native.json，最终安装包校验值在 dist/SHA256SUMS。旧 0.1.0 的报告归档在 verification/0.1.0/。
