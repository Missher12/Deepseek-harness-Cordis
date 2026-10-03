# DSH plugin directory

English | [中文](README.zh.md)

[Repository home](../README.md) · [Install](../docs/cookbook/install-cordis-plugins.md) · [Develop](../docs/cookbook/build-cordis-plugins.md)

Choose a plugin by the task it solves. These four public Bundles share a Git repository but keep separate builds, packages, settings, and installation; none requires a separate common compatibility plugin.

<a id="public-plugins"></a>

## Public plugins

| Plugin | What it does | Open in DSH | Links |
| --- | --- | --- | --- |
| Context Manager | Pre-request compaction, current context, content, per-reply changes, and session totals | Conversation → Context; Settings → Context Management | [Guide](https://github.com/Missher12/Missher-DSH-Context-Manager/tree/main/README.md) · [Source](https://github.com/Missher12/Missher-DSH-Context-Manager/tree/main/src/) · [Package](https://github.com/Missher12/Missher-DSH-Context-Manager/tree/main/package.json) |
| Usage Statistics | Cross-session usage, activity, and model/tool/skill rankings | Settings → Usage Statistics | [Guide](https://github.com/Missher12/Missher-DSH-Usage-Statistics/tree/main/README.md) · [Source](https://github.com/Missher12/Missher-DSH-Usage-Statistics/tree/main/src/) · [Package](https://github.com/Missher12/Missher-DSH-Usage-Statistics/tree/main/package.json) |
| Output Renderer | Four single-column assistant-output layouts, full reasoning, tool details, and streaming effects | Settings → Output Appearance | [Guide](https://github.com/Missher12/Missher-DSH-Output-Renderer/tree/main/README.md) · [Source](https://github.com/Missher12/Missher-DSH-Output-Renderer/tree/main/src/) · [Package](https://github.com/Missher12/Missher-DSH-Output-Renderer/tree/main/package.json) |
| Session Bridge | Session IDs, cross-session messages, and scratch workspaces | Session header; New Session → workspace selector | [Guide](https://github.com/Missher12/Missher-DSH-Session-Bridge/tree/main/README.md) · [Source](https://github.com/Missher12/Missher-DSH-Session-Bridge/tree/main/src/) · [Package](https://github.com/Missher12/Missher-DSH-Session-Bridge/tree/main/package.json) |

Package names and versions come from the linked manifests; [cordis-repositories.json](../cordis-repositories.json) records the independent repository inventory. Existing historical validation reports describe their own date and scope, not an automatic pass for a new installation.

## Choose the right owner

| Requirement | Owner |
| --- | --- |
| Image uploads and limits; composer `@plugin` references | Host [attachments](../packages/attachment/) and [client](../packages/client/) |
| Supported reasoning levels in model settings | Host [model directory](../packages/client/ui-settings-models/) |
| Current-session context and cumulative usage | Context Manager |
| Usage aggregated across sessions | Usage Statistics |
| Assistant output appearance | Output Renderer |
| Session identity, messaging, and scratch workspaces | Session Bridge |

Composer references list callable capabilities. A plugin that only adds a settings page or renderer does not become an `@` command merely because it is installed.

## Separate projects

[Reasoning Effort](https://github.com/Missher12/Missher-DSH-Reasoning-Effort) is public and includes the pixel-depth slider design. [Media@Missher](https://github.com/Missher12/Missher-Media) remains private and requires repository permission. [MSE Learning](https://github.com/Missher12/Missher-MSE-Learning) is an independent public product. Their source is not included here; see [ownership and privacy](../CORDIS.md#独立项目).

## Next steps

Follow [installation](../docs/cookbook/install-cordis-plugins.md) to enable a built plugin, or [development](../docs/cookbook/build-cordis-plugins.md) to build and package it. Continue plugin development in its linked independent repository; this host repository retains its import history.
