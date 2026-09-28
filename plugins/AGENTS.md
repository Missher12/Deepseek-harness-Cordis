# 插件维护

这里是四个公开 Bundle 的当前源码入口。各插件自己的 AGENTS.md、PROJECT_CONTEXT.md 与包边界说明继续约束业务；旧阶段的路径和 Git 等待状态由本次仓库迁移取代。后续改动只落在对应插件目录，公共接口改动单独落在根 packages/。

保持每个插件可独立构建、安装和卸载，不增加插件之间的强制依赖，不创建需额外搭配的兼容插件。当前会话累计用量属于 context-manager，跨会话聚合属于 usage-statistics；图片输入和模型能力声明属于公共宿主。context-manager 现有峰谷提示继续由它保管，不借整理擅自迁移。

根目录的构建、lint 和类型检查覆盖宿主 workspace，各插件按自身命令验证。原本地安装路径只作运行与历史保留，不能与这里双向自动同步。没有新的安装命令时不替换日常 profile 或既有 tarball。

私有 Media 与 reasoning-effort 不进入本目录；禁止提交凭据、真实聊天、附件、生产 profile 或本地安装备份。
