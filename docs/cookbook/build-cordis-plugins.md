# Build and package DSH plugins

English | [中文](build-cordis-plugins.zh.md)

[Plugin directory](../../plugins/README.md) · [Installation](install-cordis-plugins.md)

This tutorial produces installable tarballs from this repository. Build the host first, then build the plugins you want; plugin packages stay independent from the host workspace.

## Prerequisites

Complete the root [source setup](../../README.md), including dependency installation and the host build. These are macOS/Linux shell commands; Windows contributors should use the platform setup in the [host development guide](../development.md).

Each plugin’s `pnpm-workspace.yaml` resolves its development SDK from `../../packages/` and `../../vendor/` in this checkout. Keep the repository layout intact. Moving one plugin into a standalone directory breaks those local development links; installed tarballs do not use them. Package versions and scripts belong to each `package.json`, including Bridge’s own pnpm version.

## Build one plugin

From the repository root, run:

```sh
cd plugins/dsh-output-renderer
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
pnpm test
```

Substitute another directory from the [plugin list](../../plugins/README.md#public-plugins) to work on it. A build prepares runtime entries; tests and type checks validate the selected code. These commands do not install it into DSH.

## Package all four

The following block runs from the repository root. Each package is checked and built separately. Tarballs go into a new temporary output directory so an earlier delivery is not overwritten.

```sh
(
  set -e
  cordis_artifacts="$(mktemp -d "${TMPDIR:-/tmp}/cordis-bundles.XXXXXX")"
  for cordis_plugin in dsh-context-manager dsh-session-bridge dsh-output-renderer dsh-usage-statistics; do
    (
      cd "plugins/$cordis_plugin"
      pnpm install --frozen-lockfile
      pnpm run typecheck
      pnpm run build
      pnpm test
      npm pack --ignore-scripts --pack-destination "$cordis_artifacts"
    )
  done
  printf '%s\n' "$cordis_artifacts"
)
```

Proceed only if all four iterations succeed and the directory contains four `.tgz` files. `npm pack --ignore-scripts` packages the already-built files; it does not build them. Package names determine archive filenames, including the `missher-` prefix for scoped packages. Keep the output outside the source tree and move it to a durable location before clearing temporary files.

Use the [installation guide](install-cordis-plugins.md) to test the selected artifact. Package-specific checks and earlier evidence live beside each plugin: [Context Manager boundaries](../../plugins/dsh-context-manager/PLUGIN_BOUNDARIES.md), [Bridge boundaries](../../plugins/dsh-session-bridge/PLUGIN_BOUNDARIES.md), [Renderer validation](../../plugins/dsh-output-renderer/VALIDATION.md), and [Usage validation](../../plugins/dsh-usage-statistics/VALIDATION.md).

## Maintain the right project

Make public plugin changes under `plugins/` in this repository. The old standalone repositories keep historical commits and releases; old local directories may still support an installed plugin and must not be rebuilt or moved as part of this workflow. See [CORDIS.md](../../CORDIS.md) for ownership and private projects.

Before delivery, distinguish build/type checks, unit tests, package contents, real Loader installation, UI checks, and live model behavior. Test in an isolated `DSH_HOME`, preserve original packages and data, and follow [AGENTS.md](../../plugins/AGENTS.md) plus the selected plugin’s instructions. Installing into a daily application is a separate operation.
