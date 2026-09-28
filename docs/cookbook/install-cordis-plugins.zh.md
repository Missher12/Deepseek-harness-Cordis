# DSH 插件安装与卸载

[English](install-cordis-plugins.md) | 中文

[插件目录](../../plugins/README.zh.md) · [生成安装包](build-cordis-plugins.zh.md)

本指南说明如何把已构建的 Bundle 安装到 DSH profile，并检查与卸载。按实际使用方式选择桌面或 CLI/Web 流程，每个插件均可单独安装。

## 目录

- [安装前](#before-installing)
- [桌面版](#desktop)
- [CLI 与 Web](#cli-web)
- [常见问题](#troubleshooting)

<a id="before-installing"></a>

## 安装前

使用插件[包信息](../../plugins/README.zh.md#public-plugins)声明的匹配宿主，这批导入的 Bundle 面向 DSH `0.1.7-rc.2`。保留兼容检查；应用显示的版本标签不同，并不能单独证明底层 Harness 版本匹配。

GitHub 源码 ZIP 或刚克隆的仓库不是安装发行包，即使包含历史 `lib` 也要从所选源码重新构建。按[开发指南](build-cordis-plugins.zh.md)生成已构建目录或 `.tgz`。每个包需要自己的 `package.json`、声明的入口文件和 `cordis.patch.yml`，复制源码不会自动启用 Bundle。

<a id="desktop"></a>

## 桌面版

1. 在目标 DSH 应用中打开**插件 → 添加插件**。
2. 在**包名或地址**里填写已构建插件目录或 `.tgz` 的绝对路径，再执行安装。
3. 启用已安装插件，在插件详情核对包名、版本与运行组件。
4. 如果 DSH 提示重启，等待在途任务结束，完整退出应用后重新打开，再检查[插件目录](../../plugins/README.zh.md#public-plugins)对应的功能入口。

目录安装会链接该目录，需要保留目录与编译好的 `lib`；压缩包则提供固定的包内容快照。不要把本仓库的根 GitHub 地址直接填作插件包地址，这个仓库同时包含宿主和多个独立 Bundle。

升级时先保留原安装包，再使用同一个插件管理入口。卸载时也在这里选择对应包，保留会话数据及无关插件；各插件设置与缓存的处理方式见自己的说明。

桌面应用专管保留的 `desktop` profile，公开 CLI 的包管理命令不能修改它。Intel 应用使用的数据目录也可能与 CLI 不同，因此日常桌面安装使用应用界面。

<a id="cli-web"></a>

## CLI 与 Web

下面是 macOS/Linux Shell 示例，使用已构建的 checkout 和全新测试数据目录。在专用终端中进入仓库根目录执行；`DSH_HOME` 让示例与原安装隔离，关闭这个终端即可结束环境变量覆盖。

```sh
export DSH_HOME="$(mktemp -d "${TMPDIR:-/tmp}/cordis-preview.XXXXXX")"
export DSH_TELEMETRY_DISABLED=1
pnpm dsh --profile cordis-preview --from-default-profile web --dump-config > "$DSH_HOME/base.yml"
pnpm dsh plugin --profile cordis-preview add "$PWD/plugins/dsh-session-bridge"
pnpm dsh --profile cordis-preview --dump-config
```

合成配置中应包含 `session-bridge`。这一步只验证 profile 组合，还不代表界面已挂载成功。继续启动该 profile 检查插件加载：

```sh
pnpm dsh --profile cordis-preview --no-open --host 127.0.0.1 --port 3081
```

根据宿主打印的认证说明，在浏览器打开 `http://127.0.0.1:3081`；端口占用时选择其他空闲端口。检查插件列表或设置不需要发送模型请求，使用模型另需配置提供方。

试用其他插件时，把 `add` 参数换成它的已构建目录或压缩包。卸载名称取自该包的 `package.json`，带有 `@missher/` 时须保留。先按 Ctrl-C 停止测试服务，再移除示例插件：

```sh
pnpm dsh plugin --profile cordis-preview remove dsh-session-bridge
pnpm dsh --profile cordis-preview --dump-config
```

卸载后合成配置不再包含 `session-bridge` 层；检查运行组件消失时重新启动 profile。测试数据目录保留供检查或复用，本流程不会删除它，也不会触碰日常会话。

<a id="troubleshooting"></a>

## 常见问题

| 现象 | 检查与处理 |
| --- | --- |
| 缺少 `lib` 或包入口 | 安装前先构建宿主和所选插件。 |
| 版本不兼容 | 对照插件 manifest 与实际 Harness 版本，使用匹配构建，不跳过检查。 |
| 升级后出现 `ERR_PACKAGE_PATH_NOT_EXPORTED` | 核对所选安装包后完整停止并重启目标进程，参见[上下文插件升级说明](../../plugins/dsh-context-manager/README.md#从旧版升级)。 |
| Bridge 工具重复 | 同一 profile 只保留一个 `dsh-session-bridge` 实例，移除过时的开发别名。 |
| 已安装却看不到功能 | 核对组件是否启用及正确的[功能入口](../../plugins/README.zh.md#public-plugins)，渲染插件不一定出现在 `@` 引用中。 |
| 私有仓库链接显示 404 | 登录有权限的账号；私有源码按约定保留在本仓库之外。 |

原生桌面点击和真实提供方行为需要各自验收，配置输出、构建或测试成功不能代替这两层结果。
