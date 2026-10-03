# Install and remove DSH plugins

English | [中文](install-cordis-plugins.zh.md)

[Plugin directory](../../plugins/README.md) · [Development](build-cordis-plugins.md)

Select one independent Bundle from the directory. Each current package uses the `@missher/dsh-xxx` naming convention and keeps its own settings.

<a id="desktop"></a>

## Desktop

Use **Plugins → Add plugin** with the selected repository or a built `.tgz` address. The package root declares `dsh.bundle.patch` and includes its runtime entries. Check its version and enabled components after installation. The host repository itself is not a plugin package.

A directory installation retains a link to that directory; keep its files in place. A tarball carries a fixed snapshot. Before replacing an installed version, retain the previous package and let active tasks finish. If a restart is requested, quit fully and reopen DSH.

The desktop application owns the reserved `desktop` profile. Public CLI commands cannot modify that profile. Use the application's plugin management for the daily desktop installation.

## Verification and removal

Open the feature listed in the plugin directory and inspect its loaded components. Merely downloading a package does not enable it. Uninstall the selected package through the same plugin manager; preserve other plugins, credentials and sessions.

Current packages do not impose a host version range; the development SDK is a tested baseline. Actual required interfaces must still exist. A new official version label alone does not prove plugin compatibility.

Media remains private and requires access to its repository. MSE publishes only the standalone learning product. Neither credentials nor personal learning records are included in a Git clone.

For CLI or Web profiles, follow the selected package's README with a separate test data directory. Native desktop clicks and real model use require their own acceptance checks.
