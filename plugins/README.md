# DSH plugin directory

English | [中文](README.zh.md)

[Repository home](../README.md) · [Install](../docs/cookbook/install-cordis-plugins.md) · [Develop](../docs/cookbook/build-cordis-plugins.md)

Choose a plugin by the task it solves. These four public Bundles share a Git repository but keep separate builds, packages, settings, and installation; none requires a separate common compatibility plugin.

<a id="public-plugins"></a>

## Public plugins

| Plugin | What it does | Open in DSH | Links |
| --- | --- | --- | --- |
| Context Manager | Pre-request compaction, current context, content, per-reply changes, and session totals | Conversation → Context; Settings → Context Management | [Guide](dsh-context-manager/README.md) · [Source](dsh-context-manager/src/) · [Package](dsh-context-manager/package.json) |
| Usage Statistics | Cross-session usage, activity, and model/tool/skill rankings | Settings → Usage Statistics | [Guide](dsh-usage-statistics/README.md) · [Source](dsh-usage-statistics/src/) · [Package](dsh-usage-statistics/package.json) |
| Output Renderer | Three single-column assistant-output layouts, full reasoning, tool details, and streaming effects | Settings → Output Appearance | [Guide](dsh-output-renderer/README.md) · [Source](dsh-output-renderer/src/) · [Package](dsh-output-renderer/package.json) |
| Session Bridge | Session IDs, cross-session messages, and scratch workspaces | Session header; New Session → workspace selector | [Guide](dsh-session-bridge/README.md) · [Source](dsh-session-bridge/src/) · [Package](dsh-session-bridge/package.json) |

Package names and versions come from the linked manifests; [cordis-repositories.json](../cordis-repositories.json) records the imported package inventory. Existing historical validation reports describe their own date and scope, not an automatic pass for a new installation.

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

[Reasoning Effort](https://github.com/Missher12/dsh-reasoning-effort) is public and includes the pixel-depth slider design. [Media@Missher](https://github.com/Missher12/media-missher) remains private and requires repository permission. [MSE Learning](https://github.com/Missher12/mse-learning) is an independent public product. Their source is not included here; see [ownership and privacy](../CORDIS.md#独立项目).

## Next steps

Follow [installation](../docs/cookbook/install-cordis-plugins.md) to enable a built plugin, or [development](../docs/cookbook/build-cordis-plugins.md) to build and package it. Continue development in this repository; the four old standalone public plugin repositories retain history and old releases as read-only migration entries.
