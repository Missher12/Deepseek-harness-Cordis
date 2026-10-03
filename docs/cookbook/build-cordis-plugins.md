# Build and package DSH plugins

English | [中文](build-cordis-plugins.zh.md)

[Plugin directory](../../plugins/README.md) · [Installation](install-cordis-plugins.md)

Each plugin has an independent repository, package manifest, lockfile and runtime. The host does not require these optional packages.

## Source and SDK

Clone the selected repository from the plugin directory. For development, build [Missher DeepSeek Harness Desktop](https://github.com/Missher12/Missher-DeepseekHarness-Desktop) first and follow the plugin README to link that explicit SDK checkout. The ignored `harness-sdk` link replaces assumptions about a monorepo directory layout.

The plugin owns its typecheck, build and test commands in `package.json`. Its `pnpm-workspace.yaml` pins development SDK links; these links are not shipped in the runtime package. Preserve the committed lockfile and the package's selected pnpm version.

## Delivery

The independent Git repositories contain the accepted built `lib` files as well as source. `GIT_DELIVERY.json` records the source baseline, accepted package digest and individual runtime file digests. It is evidence for that delivery, not a substitute for validating later edits.

For a new delivery, build and validate in an isolated checkout, then package it outside the source directory. Preserve previous archives and test installation in a separate profile. Do not rebuild a directory linked by a running daily application.

Keep source checks, Loader installation, browser or native UI, and real model acceptance separate. See each repository's `AGENTS.md` and package boundary checks before editing.
