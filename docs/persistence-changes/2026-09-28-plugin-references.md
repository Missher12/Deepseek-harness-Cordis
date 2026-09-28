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
## Compatibility

Existing records remain valid. The source kind and instances are attribution only: older readers preserve unknown metadata and replay the recorded content without requiring the resolver, catalog or permissions. New direct user markers are validated separately before enqueue and again at pre-step; this does not add a replay requirement. The Session writer version is unchanged.

<a id="verification"></a>
## Verification

55 focused tool and inventory tests passed. A formal Web profile with generated Remotes sent the original marker and selected-only guidance to a local fake endpoint; requestId retries were deduplicated and disabled or unloaded references were rejected.

<a id="dev-note"></a>
## Dev Note

None.
