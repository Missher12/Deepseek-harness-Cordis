# Install and remove DSH plugins

English | [中文](install-cordis-plugins.zh.md)

[Plugin directory](../../plugins/README.md) · [Build packages](build-cordis-plugins.md)

This guide takes a built Bundle into a DSH profile and shows how to verify and remove it. Pick the desktop or CLI/Web path below; each plugin can be installed on its own.

## Contents

- [Before installing](#before-installing)
- [Desktop](#desktop)
- [CLI and Web](#cli-web)
- [Troubleshooting](#troubleshooting)

<a id="before-installing"></a>

## Before installing

Use the matching DSH host declared by the plugin’s [package manifest](../../plugins/README.md#public-plugins); these imported Bundles target DSH `0.1.7-rc.2`. Keep compatibility checks enabled. A different application version label alone does not establish a matching Harness runtime.

A GitHub source ZIP or fresh clone is not an installation release. Build from the selected source even if a historical `lib` is present. Follow [development](build-cordis-plugins.md) to produce a built directory or `.tgz`. Each package needs its `package.json`, declared entry files, and `cordis.patch.yml`; copying source to disk does not activate its Bundle.

<a id="desktop"></a>

## Desktop

1. Open **Plugins → Add plugin** in the target DSH application.
2. In **Package name or address**, enter the absolute path to a built plugin directory or its `.tgz`, then install it.
3. Enable the installed plugin. Check its package name, version, and running components in the plugin details.
4. If DSH requests a restart, wait for active tasks to finish, quit the application completely, and reopen it. Open the feature listed in the [plugin directory](../../plugins/README.md#public-plugins).

A directory installation links that directory; retain it and its built `lib` files. Tarballs give the installation a fixed package snapshot. Do not enter this repository’s root GitHub URL as a plugin package: the repository contains a host and several separate Bundles.

For an update, keep the previous package and use the same plugin-management entry. For removal, uninstall the selected package there. Preserve session data and unrelated plugins; plugin-specific configuration and cache behavior is documented in each plugin’s guide.

The desktop application owns its reserved `desktop` profile. Public CLI package commands cannot modify it, and an Intel application may use a different data directory from the CLI. Use the desktop UI for that application’s installation.

<a id="cli-web"></a>

## CLI and Web

The following macOS/Linux shell example uses a built checkout and a new test data directory. Run it from the repository root in a dedicated terminal. `DSH_HOME` keeps this example apart from an existing installation; closing this terminal ends the environment override.

```sh
export DSH_HOME="$(mktemp -d "${TMPDIR:-/tmp}/cordis-preview.XXXXXX")"
export DSH_TELEMETRY_DISABLED=1
pnpm dsh --profile cordis-preview --from-default-profile web --dump-config > "$DSH_HOME/base.yml"
pnpm dsh plugin --profile cordis-preview add "$PWD/plugins/dsh-session-bridge"
pnpm dsh --profile cordis-preview --dump-config
```

The composed configuration includes `session-bridge`. This verifies profile composition, not a successful UI mount. Start that profile to check plugin loading:

```sh
pnpm dsh --profile cordis-preview --no-open --host 127.0.0.1 --port 3081
```

Open `http://127.0.0.1:3081` using the authentication instructions printed by the host. Use another free port if needed. Do not send a model request merely to check the plugin list or settings; model use needs separate provider configuration.

To try a different plugin, substitute its built directory or tarball in the `add` command. The correct removal name comes from that package’s `package.json`, including `@missher/` where present. Stop the test server with Ctrl-C before removing the example:

```sh
pnpm dsh plugin --profile cordis-preview remove dsh-session-bridge
pnpm dsh --profile cordis-preview --dump-config
```

The `session-bridge` layer disappears after removal. Restart the profile when checking that its running components have gone. Keep the test data directory if you want to inspect or reuse it; this procedure does not delete it or touch daily sessions.

<a id="troubleshooting"></a>

## Troubleshooting

| Symptom | Check and recovery |
| --- | --- |
| Missing `lib` or a package entry | Build the host and the selected plugin before installation. |
| Incompatible version | Compare the plugin manifest with the actual Harness runtime; use a matching build instead of bypassing the check. |
| `ERR_PACKAGE_PATH_NOT_EXPORTED` after an update | Confirm the selected package, then fully stop and restart the target process; see [Context Manager upgrade notes](../../plugins/dsh-context-manager/README.md#从旧版升级). |
| Duplicate Bridge tools | Keep one instance of `dsh-session-bridge`; remove an obsolete development alias in that same profile. |
| Plugin is installed but its feature is absent | Check enabled components and the feature’s actual [entry point](../../plugins/README.md#public-plugins); an installed renderer need not appear in `@` references. |
| A private repository link returns 404 | Sign in with an account granted access; private source is intentionally outside this repository. |

Native desktop clicks and real provider behavior require their own acceptance checks. A successful config dump, build, or test cannot establish either result.
