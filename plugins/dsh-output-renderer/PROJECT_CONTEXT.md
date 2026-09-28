# DSH 输出渲染

更新：2026-09-28。本目录为输出渲染的唯一权威源码，当前基线 `main` / `a27923361e567cab70f70c25bf84ccbc7595101b` / 0.1.0。职责协调入口为 `/Users/missher/Documents/Deepseek-harness-Cordis/PROJECT_GOVERNANCE.md`。

用户于 2026-09-27 授权将四种预览布局全部接入设置，并优先实现随显示刷新率更新的输出与新增文字淡入。布局为 reader/cards/timeline/split；思考全文可见，工具详情保留原生操作。

本目录是独立可卸载 Bundle，包名 @missher/dsh-output-renderer。本任务只写本目录及自己的协调回执 `/Users/missher/Documents/Deepseek-harness-Cordis/coordination/2026-09-28/render.md`；不修改总台账或根目录的 MSE 历史文档。宿主参考 `/Users/missher/Documents/Deepseek- Harness-Inter`，本轮只读复核为 0.1.7-rc.2 / `e3409377ac873963595b76c0eb9afd8a8aa241af`。该树的 Session Bridge/API/Workspace/module 等未提交工作属于其他任务，不修改、不构建、不覆盖。

职责：助手输出布局、思考与工具区域的呈现、流式文字动效及自己的设置页。通过宿主 `renderMessageImages` 呈现已有图片，不接管上传、附件限额或发送链路；不负责模型能力配置、上下文数据/压缩、跨会话统计、会话身份、媒体采集或持久学习。REQ-01/02/03/04 均不在本轮实施。

方案：使用公开 settings.section、configForms、conversation.chat.node 的优先级覆盖，仅替换 assistant-step 渲染，复用原生 Markdown、图片、路径与文件链接；原生工具/输入/权限不替换。应用范围的聊天布局选择器要求 `html[data-dsh-output-renderer]`，局部选择器使用 `.dsh-output-*`；整张样式表具有插件归属标记并随卸载删除。设置独立持久化在 output-renderer 命名空间。

保留用户要求的全文例外：隐藏外层 turn-process 折叠入口，展开含思考的过程容器并隐藏其组标题，以免已收到的思考被裁切。纯工具组和工具条目使用原生详情操作，不能为「归位」恢复思考折叠。上述布局依赖 0.1.7-rc.2 的聊天数据属性，宿主升级前需重新联调。

本轮状态：审查开始工作树干净；在临时副本通过 13 项既有测试、Host/Client 类型检查及 7 组受控 DOM/边界检查。仅纠正文档，不改业务源码、版本或已交付包，不写生产 profile、不重启应用、不执行 Git 写操作。受控检查使用模拟宿主接口和 Markdown，不代表真实 Loader 或原生 UI 验收；详情见 VALIDATION.md 和协调回执。

历史状态：2026-09-27 已完成四布局与两动效、隔离 Host/profile 的 Loader 与 Web UI 验收，并生成最终安装包。该轮日常安装被官方 CLI 的 desktop profile 专管规则拒绝，未绕过入口。日常 app 当时位于 `/Users/missher/Applications/DeepSeek Harness.app`，版本 0.1.7-rc.2；本轮未重新检查其版本、安装状态或预览进程，不能据此断言现在仍未安装。用户可从 DSH 内的「插件 → 添加插件」安装 DELIVERY.md 指定的 tgz。

核验记录写 VALIDATION.md；不将 rAF 调度等同于真实设备恒定 120/240 fps。禁止打包 verification、测试适配器或任何运行数据。
