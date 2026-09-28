# 安装与卸载

插件 **0.2.0** 适配 **DSH / Desktop 0.1.7-rc.2**。旧插件 0.1.0 为 Desktop 0.5.10 / DSH 0.1.5-rc.2 制作，不能用于当前宿主。无需添加版本豁免。

## Desktop 本地目录安装

1. 打开侧栏「插件」，点击「添加插件」。
2. 在「包名或地址」中填写本插件根目录的绝对路径，即包含 `package.json`、`cordis.patch.yml` 和 `lib` 的目录。
3. 点击「安装」，确认显示版本 **0.2.0**，完成后点击「立即启用」。
4. 打开左下角「更多 → 设置 → 使用统计」。若界面提示下次启动生效，按提示重启应用。

此前停留在旧版兼容性错误页时，关闭添加窗口再重新填写路径，让宿主重新读取清单。若已经装入旧版，先在插件页卸载旧版再安装当前目录；统计原始数据仍由宿主持久化服务保存。

本地目录安装使用链接，请保留该目录及编译好的 `lib`。新下载的安装包可以解压后填写其 `package` 子目录；直接安装压缩包时，在同一输入框填写 `missher-dsh-usage-statistics-0.2.0.tgz` 的绝对路径。使用本插件 `pack:bundle` 脚本时，校验值写入安装包旁的 `SHA256SUMS`；通过公共 `npm pack` 流程打包时不会自动生成该文件。

## CLI 与 Web 的独立 profile

Desktop 的保留 `desktop` profile 由应用专管，公开 CLI 不能对它安装或卸载插件。不要为了测试把 `DSH_HOME` 指向日常 Desktop 数据目录；使用[统一安装指南](https://github.com/Missher12/Deepseek-harness-Cordis/blob/main/docs/cookbook/install-cordis-plugins.zh.md#cli-web)中的隔离流程，把示例包替换为本插件的已构建目录或 `.tgz`。

卸载名称是 `@missher/dsh-usage-statistics`。具有自定义数据目录的 Intel 应用优先使用上面的界面安装，默认 `~/.dsh` 不一定是它正在使用的数据目录。查看本地统计不需要配置 API Key。

## 卸载

进入侧栏「插件」，打开 `@missher/dsh-usage-statistics` 并点击「卸载」。确认后统计入口和服务随插件撤销；0.1.7-rc.2 本身没有内置统计页。CLI/Web 自定义 profile 的卸载流程见上面的统一指南，使用本插件的完整包名。

插件自己的派生缓存保留供重新安装使用。会话、模型设置和凭据不由卸载逻辑删除。
