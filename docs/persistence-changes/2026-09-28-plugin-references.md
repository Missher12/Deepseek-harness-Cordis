---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-09-28-plugin-references

English | [中文](2026-09-28-plugin-references.zh.md)

## Summary

Adds attribution for selected plugin guidance in logged user messages.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

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
## Compatibility

Existing records remain valid. The source kind and instances are attribution only: older readers preserve unknown metadata and replay the recorded content without requiring the resolver, catalog or permissions. New direct user markers are validated separately before enqueue and again at pre-step; this does not add a replay requirement. The Session writer version is unchanged.

<a id="verification"></a>
## Verification

55 focused tool and inventory tests passed. A formal Web profile with generated Remotes sent the original marker and selected-only guidance to a local fake endpoint; requestId retries were deduplicated and disabled or unloaded references were rejected.

<a id="dev-note"></a>
## Dev Note

None.
