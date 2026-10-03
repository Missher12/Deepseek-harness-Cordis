# Missher DSH Inter

English | [中文](README.zh.md)

Missher DSH Inter desktop source and navigation to independently maintained plugins. Start with the [plugin directory](plugins/README.md), [installation guide](docs/cookbook/install-cordis-plugins.md), or [plugin development guide](docs/cookbook/build-cordis-plugins.md).

This project builds on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), developed by [DeepSeek AI](https://deepseek.com), and the **everything-is-a-plugin** architecture powered by [Cordis](https://github.com/cordiverse/cordis). Upstream authorship, history, and licenses are retained. See [repository ownership](CORDIS.md) for the relationship between this repository and the original projects.

## Quick access

| I want to… | Open |
| --- | --- |
| Inspect or compress the current session’s context | [Context Manager](https://github.com/Missher12/Missher-DSH-Context-Manager/blob/main/README.md) |
| Read usage across sessions | [Usage Statistics](https://github.com/Missher12/Missher-DSH-Usage-Statistics/blob/main/README.md) |
| Change assistant output, reasoning, or tool layouts | [Output Renderer](https://github.com/Missher12/Missher-DSH-Output-Renderer/blob/main/README.md) |
| Find session IDs, send between sessions, or use scratch workspaces | [Session Bridge](https://github.com/Missher12/Missher-DSH-Session-Bridge/blob/main/README.md) |
| Install, update, or remove a plugin | [Installation](docs/cookbook/install-cordis-plugins.md) |
| Build, test, or package a plugin | [Development](docs/cookbook/build-cordis-plugins.md) |
| Find private plugins or MSE Learning | [Independent projects](CORDIS.md#独立项目) |

Each plugin remains optional and removable. Cloning this repository does not install or enable plugins in DSH. The [plugin directory](plugins/README.md) maps plugin features to their source and user entry points.

## Ubuntu desktop

Linux x64 downloads are published to [Releases](https://github.com/Missher12/Missher-DSH-Inter/releases) after the Ubuntu workflow passes. Choose the `.deb` for Ubuntu 24.04 x64, or the `.AppImage` for portable use; each release includes `SHA256SUMS`. macOS and Ubuntu share source, but their packaged binaries and native dependencies are different.

Install the downloaded `.deb` with `sudo apt install ./deepseek-harness-*.deb`, then launch **DeepSeek Harness** from Applications. Configure your own provider credentials and install the desired plugins separately. Community Linux packages do not automatically install updates; replace them with a newer release when available.

<a id="run"></a>

<a id="run-from-source"></a>

## Run this source tree

Use Node.js `^22.19.0 || >=24.0.0` and pnpm `11.7.0`, as declared in [package.json](package.json). Review the [safety notice](SAFETY.md); Harness remains a developer preview with APIs that can change incompatibly.

```sh
git clone https://github.com/Missher12/Missher-DSH-Inter.git
cd Missher-DSH-Inter
pnpm install --frozen-lockfile
pnpm run build
pnpm dsh web
```

The Web UI normally opens at `http://127.0.0.1:3080`. For development beside an existing installation, use a separate test data directory and review [profile ownership](docs/cookbook/install-cordis-plugins.md#desktop). Root builds prepare the host; optional plugins have their [own build and packaging steps](docs/cookbook/build-cordis-plugins.md).

`npx @deepseek-ai/dsh web` runs the published upstream package. It does not select this checkout or include the independent custom plugins. Install independent plugins from their own releases according to the installation guide.

## Documentation and contribution

- [Plugin navigation](plugins/README.md): source, user guides, and in-app entry points.
- [Development](docs/development.md), [architecture](docs/architecture.md), and [contribution guide](CONTRIBUTING.md): host development and review.
- [Web UI guide](docs/user/guide/index.md): everyday Harness use.
- [CORDIS.md](CORDIS.md): repository ownership, private projects, historical repositories, and verification scope.
- [Issues](https://github.com/Missher12/Missher-DSH-Inter/issues): reports about this repository; include the host/plugin versions, reproduction steps, and redacted errors.
- [Upstream documentation](https://deepseek-harness.github.io/deepseek-harness/) and [upstream discussions](https://github.com/deepseek-ai/deepseek-harness/discussions): official Harness documentation and community.

Agents follow [AGENTS.md](AGENTS.md) and each plugin’s instructions. Source publication, successful tests, installation, and live model verification are distinct results; the owning validation document states its tested scope.

## Upstream citation

Cordis’s design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512). Cite the original Harness project as follows:

```bibtex
@misc{deepseek-harness2026,
  title={DeepSeek Harness: Everything is a Plugin},
  author={DeepSeek-AI},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/deepseek-ai/deepseek-harness}},
}
```

## License

[MIT](LICENSE). Third-party dependencies and licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the individual plugin license files.
