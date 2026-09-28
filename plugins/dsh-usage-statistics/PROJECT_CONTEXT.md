# 当前状态

2026-09-28 协调审查：源码 HEAD `4058457826ca5c7f3a618ab82cff8a872bb74d1a`、版本 **0.2.0**，开始时工作树干净；本地 `origin/main` 也指向此 SHA，本轮未查询远端实时状态。职责为跨会话用量、活动、常用模型/推理强度与工具/技能排行；context-manager 本会话累计、REQ-02 模型能力设置和 REQ-03 详情展开不归本插件。具体口径见 README.md。

本轮在 `/private/tmp/dsh-usage-audit-20260928-j1i_ytlg/plugin` 隔离副本运行 aggregate / fold / service / snapshot-cache 四个已有测试文件，**40/40 通过**。仍通过宿主持久化服务读取，只写本插件派生缓存。仅纠正文档；未改 src/lib/manifest、未构建打包或安装、未触碰生产 profile、未重启应用、未执行 Git 暂存或发布操作。现有 lib 与 0.2.0 安装包、历史原生验收记录的入口哈希一致；这只是字节核对，不是本轮原生验收。独占回执见 `/Users/missher/Documents/Deepseek-harness-Cordis/coordination/2026-09-28/ui-usage.md`。

## 2026-09-26 兼容性修复与验收（历史）

用户在本地目录安装时，宿主报告 0.1.0 不兼容 DSH 0.1.7-rc.2。当时确认应用是用户 Applications 下的 DeepSeek Harness Intel 0.1.7-rc.2，插件升级为 **0.2.0**，精确适配此内核；0.1.0 安装包仍留在 dist，适配旧 Desktop 0.5.10 / DSH 0.1.5-rc.2。

开发依赖链接到已构建的 0.1.7-rc.2 源码，参考 SHA e3409377ac873963595b76c0eb9afd8a8aa241af；旧依赖链接备份在本仓库 .verification/node_modules-015rc2。不得修改宿主源码、日常数据或其他插件。本地根目录已通过图形界面安装验证；本段不声明远端发布现状。

插件拥有 usageStatistics Remote、usage.statistics Locale、missher_usage_statistics 派生缓存及 Client 入口。0.1.7-rc.2 没有内置使用统计，Bundle 只插入独立插件；卸载撤销入口。Client 必须 ctx.inject(['remote.usageStatistics'], ...)；新版 Typert codec 必须 create() 工厂，不能退回 schema 属性。所有宿主依赖使用匹配的 peer，不用版本豁免。

2026-09-26 验证：类型检查、64 项测试、目录与 tarball 的完整 CLI profile 安装/读取/卸载、原生目录安装/立即启用/统计图表/卸载均通过。实际验收运行时与当时应用的差异及验证限度见 VALIDATION.md、verification/runtime.json。原生脚本须使用尊重 DSH_HOME 的未包装参考应用；当时 Intel 启动包装会覆盖这个环境变量，不能直接拿它执行隔离测试。

脚本、报告和合成 V4 会话均在本仓库。截图不代表日常用量。运行时代码的校验值在 verification/native.json，最终安装包校验值在 dist/SHA256SUMS。旧 0.1.0 的报告归档在 verification/0.1.0/。
