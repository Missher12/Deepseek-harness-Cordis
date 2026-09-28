---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-09-28-plugin-references

[English](2026-09-28-plugin-references.md) | 中文

## 概述

为日志用户消息中的所选插件指引添加归因。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

```yaml persistence-change
schemaVersion: 1
id: 2026-09-28-plugin-references
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-09-16-session-format-v4"
    after: "41fa4e1ffeec29f5ee7dba15d1ede01bbc134a02b57427c8f21ab3460fbe20b1"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-09-16-session-format-v4"
    after: "67151321039c3ad59d958f3bc5384d10216c6f23f14e799533b1a4948e23cc52"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-09-16-session-format-v4"
    after: "461462e6a4993a978f5c4c03a13aa335c4bff2f58d6a72e37fc879830c0fcb0a"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-09-16-session-format-v4"
    after: "df33c376d3b03bd9565870c02dd7f8ced4a36dbfe59803e1e73a22a36be254d4"
    decision: same-version
```

<a id="compatibility"></a>
## 兼容性

既有记录保持有效。source kind 和 instances 仅为归因：旧读取器保留未知元数据，并回放记录正文，无需解析器、目录或权限。新的直接用户标记在入队前及 pre-step 单独校验，不增加回放要求。Session 写入版本不变。

<a id="verification"></a>
## 验证

55 项工具与清单定向测试通过。正式 Web profile 使用生成 Remote，将原标记与仅选中插件的指引发送到本机假端点；requestId 重试去重，禁用或卸载的引用被拒绝。

<a id="dev-note"></a>
## 开发备注

无。
