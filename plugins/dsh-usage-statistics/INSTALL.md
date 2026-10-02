# 安装与卸载

本地候选 **0.2.1-local.9** 已在 **DSH 0.2.0-rc.2** 隔离验证。运行时沿用正常 Host 检查，不按版本号豁免。日常应用安装由协调会话统一执行，验证层级见 [VALIDATION.md](VALIDATION.md)。

## Desktop 压缩包安装

1. 打开侧栏「插件 → 添加插件」。
2. 在「包名或地址」中填写已验证的 `missher-dsh-usage-statistics-0.2.1-local.9.tgz` 绝对路径。压缩包包含 Host/Client/Typert 入口，安装时无需构建；由包管理器解析运行依赖。
3. 确认显示版本 **0.2.1-local.9**，完成后按宿主提示启用或重启。
4. 打开「设置 → 使用统计」。查看本地统计不需要 API Key。

使用交付记录中的 SHA256 核对包；`scripts/pack.mjs` 在包旁生成 `SHA256SUMS`。已有版本的升级由正常插件安装流程处理，不为升级清空会话或统计缓存。

## 本地插件目录

「本地插件目录」填写的是**已构建且依赖已准备好的目录**，须含 `package.json`、`cordis.patch.yml`、`lib` 和可解析的运行依赖。目录安装使用链接，单纯解压 tgz 并不会为该目录准备 Cordis 等 peer 依赖，可能出现“failed to import”。

本轮交付记录提供了已准备的本机目录，其运行依赖只读链接到本机已构建 SDK，未另装宿主。该目录可直接填写，但须保留目录及其依赖目标；跨电脑交付请使用上面的压缩包安装流程，不复制本机依赖链接。开发者可按 README 的 SDK 流程准备自己的源码目录。

本轮维护源码目录的 `lib` 保留原字节，不能用它替代已验证候选。此前停留在旧版兼容性错误页时，关闭添加窗口后重新填写已准备的路径，让宿主重新读取清单。

## CLI 与 Web 的隔离 profile

Desktop 的保留 `desktop` profile 由应用专管，公开 CLI 不能对它安装或卸载插件。不要为了测试把 `DSH_HOME` 指向日常 Desktop 数据目录；使用[统一安装指南](https://github.com/Missher12/Deepseek-harness-Cordis/blob/main/docs/cookbook/install-cordis-plugins.zh.md#cli-web)中的隔离流程，把示例包替换为本插件的已构建包。

卸载名称是 `@missher/dsh-usage-statistics`。自定义数据目录的 Intel 应用使用实际应用内的插件入口；默认 `~/.dsh` 不一定是它正在使用的数据目录。

## 卸载与回退

在侧栏「插件」中打开本插件并卸载，统计入口和服务随之撤销，派生缓存保留供重装使用；会话、模型设置和凭据不会由插件删除。回退可重新安装之前的 0.2.1-local.7 包；旧版本会按自己的格式重新生成派生缓存，不需要回写或替换原始会话。协调安装前仍应保存最新 profile、锁文件与派生缓存备份。

历史版本：0.2.0 对应 DSH 0.1.7-rc.2；0.1.0 对应 Desktop 0.5.10 / DSH 0.1.5-rc.2。旧包原有的版本限制不变。
