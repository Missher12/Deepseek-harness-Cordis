# Independent DSH plugins

English | [中文](README.zh.md)

These plugins share one Git repository but keep separate builds, packages, and installation. Selecting one plugin does not install the others or require a common compatibility plugin.

| Plugin | Purpose | Entry |
| --- | --- | --- |
| context-manager | Compaction and current-session context inspection | [Guide](dsh-context-manager/README.md) |
| session-bridge | Session identity, cross-session messages, and scratch workspaces | [Guide](dsh-session-bridge/README.md) |
| output-renderer | Assistant output, reasoning, and tool presentation | [Guide](dsh-output-renderer/README.md) |
| usage-statistics | Usage across sessions | [Guide](dsh-usage-statistics/README.md) |

Each package.json owns the package name and version. Install and build the root host first, then install dependencies and run the owning build in each plugin directory; each directory's pnpm overrides resolves the development SDK from this repository. Before packaging, verify the complete Host, Client, and configuration entries with that plugin's checks. A copied directory or existing lib does not establish activation.

See the [repository guide](../CORDIS.md) for private plugins and independent products.
