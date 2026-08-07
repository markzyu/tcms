This is a new project, work in progress.

### Prerequisites

To get started, please install nvm, node 22, and yarn 2. Then run:
```bash
cd tcms
yarn
yarn prepare

# Install Xcode and Android Studio. Then, run:
mkdir -p ~/.local/bin
ln -s $(which yarn) ~/.local/bin/yarn-tcms
```

For Android development, please also make sure you've defined the relevant `ANDROID_NDK_HOME` environment variables

```
export ANDROID_HOME="/path/to/your/android/sdk"
export ANDROID_NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 $ANDROID_HOME/ndk)"
export PATH="$PATH":$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/darwin-x86_64/bin:"$ANDROID_HOME"/platform-tools:"$HOME"/.local/bin
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

For Linux development, install the [Tauri 2 Linux prerequisites](https://v2.tauri.app/start/prerequisites/) (Debian/Ubuntu):

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

For Linux development, please also make sure to install `pkg-config`, `libglib2.0-dev`, and `libgtk-3-dev` (provides `gdk-3.0`), if they are not already pulled in as dependencies:

```sh
sudo apt install pkg-config libglib2.0-dev libgtk-3-dev
```

For Windows development, use a windows-gnu host Rust toolchain (not the default windows-msvc host) plus a MinGW-w64 toolchain on `PATH` (e.g. [w64devkit](https://github.com/skeeto/w64devkit)). Then configure `%USERPROFILE%\.cargo\config.toml` as follows — `rust-lld` needs the gnu host's bundled self-contained MinGW import libs, and is required because Windows limits the maximum number of exported symbols:

```toml
[target.x86_64-pc-windows-gnu]
linker = "rust-lld"

[profile.dev.package."*"]
opt-level = 3
```

For Windows development, please also make sure you have a basic `zip` binary. You can create one based on `7z` by adding a batch file `zip.bat` to your path with the following content:

```batch
@echo off
7z a %*

REM You can also use the commandline version of zip called 7za, instead of 7z.
```

### Development

To verify the baseline correctness of all packages, templates, and the app, run:
```bash
yarn prepush
```

Meanwhile, you can start the development server for the ThorCMS app:

For Desktop development, run:
```bash
yarn workspace @tcms/app tauri dev
```

For Android development, run:
```bash
yarn workspace @tcms/app tauri android dev --host
```

For iOS development, run:
```bash
yarn workspace @tcms/app tauri ios dev --host
```

To build the app bundle and estimate bundle size, run this and then open the `app/dist/bundle-size-analysis.html` file:
```bash
yarn workspace @tcms/app build
```

## Recommended VSCode Setup

Please make sure `rust-analyzer` is installed and make sure `checkOnSave` is disabled. This is because it conflicts with Android Studio's gradle builds (cache busting issues).

This repo aims to setup all non-tauri builds of Rust to use their own isolated target directories. It's probably not perfect, but it's a start.

```json
{
  "editor.tabSize": 2,
  "rust-client.engine": "rust-analyzer",
  "rust-analyzer.checkOnSave": false,
  "[rust]": {
      "editor.tabSize": 2,
      "editor.quickSuggestions": {
          "other": true,
          "comments": false,
          "strings": true
      }
  }
}
```

Instead, we have a custom build task in VSCode to manually run cargo check for the target architecture: `.vscode/tasks.json`.

Please add the following to keyboard shortcuts to run the build task:
```json
{
  "key": "ctrl+shift+c",
  "command": "workbench.action.tasks.runTask",
  "args": "Cargo Check (Target Arch)"
}
```

Or, for vim extension users, add the following to VSCode User Settings:
```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "c"],
      "commands": [
        {
          "command": "workbench.action.tasks.runTask",
          "args": "Cargo Check (Target Arch)"
        }
      ],
    }
  ]
}
```

## License

Thor CMS (TCMS) is free software licensed under the [GNU Lesser General Public License v3.0 or later](COPYING). Copyright © 2026 Zhongzhi Yu.
