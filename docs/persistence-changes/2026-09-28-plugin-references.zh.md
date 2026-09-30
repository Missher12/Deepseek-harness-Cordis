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
    previous: "2026-09-21-user-question-reply"
    after: "227934472e5552e26ad75607ba117c8b8bfb3b108756a6f86d487463e4bcfd63"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-09-21-user-question-reply"
    after: "02cce8feb7d0bd20da2ce4015629a6ba27112f9705175ab6a2ba0923fde81fca"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-09-21-user-question-reply"
    after: "f18eb69241a12ffda4f29df8bd90360c7f238a94773ec62d13d9e7ec750c4d60"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-09-21-user-question-reply"
    after: "992ba04fb55780c3dcb7cf6c1749acee3095512b32f4b85f431dd0174bff75d1"
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
