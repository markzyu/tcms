## OS compatibility and Production Release readiness

For Windows, we are using the `x86_64-pc-windows-gnu` target for now. But this target is not suitable for actual releases, and it is not supported by Tauri. What's worse, The MingW bindings for webview2 is unstable and might not work on all Windows versions.

For Linux, we only support the `x86_64-unknown-linux-gnu` target for now. I have not tested this against musl distributions such as Alpine Linux.

Although designed to support older versions of Android and iOS, I have not tested the release packages on a wide range of actual devices.

In general, this project is currently configured for ease of development setup but it's not ready for production releases.

## Tailwind

We cannot use Tailwind CSS v4 because it is not compatible with older devices (Android 6, macOS 12, etc).

For example, the `md:hidden` class on v4 is compiled to 
```css
.md\:hidden {
  @media (width >= 768px) {
    display: none;
  }
}
```

This uses Media Queries v4 syntax (media query ranges) as well as Native CSS Nesting. These are very new features.

Both of these are not supported by older devices. And this project cares about supporting older devices.

## Tauri FS and Path plugin, workaround 1: appDir path

As of the time of project creation, Tauri doesn't have mature support for the App Data folder of mobile OS: https://github.com/tauri-apps/tauri/issues/12276

Additionally, we intend to bundle the templates and assets into the ThorCMS app itself as a standard Tauri bundle.

So we use this workaround to handle mobile OS file system operations:

* LocalCDN will run on native FS syscalls. It must be given a folder which it has the permissions to read and write to.
* ThorCMS will use Tauri resourceDir to read the templates from its app bundle.
* ThorCMS will rely on Tauri path plugin to deduce the Windows/macOS/Linux paths for app data folder.
* However, for iOS and Android, ThorCMS will determine the storage location by itself.
* And, ThorCMS will use native FS syscalls to copy the templates to the target storage location.

This workaround has the following assumptions:

* Each OS should provide a parent folder that the ThorCMS app has +RW-X access to.
* This folder has a standard path on each OS, which we can deduce based on OS version alone.

## Tauri FS and Path plugin, workaround 2: zipping prefab instances

Templates are supposed to act as a zip file because nothing in it should be modified at runtime.

Instance prefabs were originally supposed to be a real folder. But this doesn't work well on Android:

There is a bug in tauri upstream causing some file extensions to return the entire APK data when queried through tauri-fs plugin, on Android.

(See https://github.com/tauri-apps/tauri/issues/13554 and https://github.com/tauri-apps/plugins-workspace/pull/3204)

So instead,

* We zip the instances into its own zip files.
* We have to unzip the zip from the app bundle and then unzip it again to the target storage location. (LCDN expects real folders)

However, this workaround itself is unstable because Android's build tools may eventually decide to change how `*.zip` assets are handled.

For this reason, we have a bash script to verify the assumptions of this workaround: `yarn android:test-apk`

You can also check the relevant AAPT2 algorithm [here](https://cs.android.com/android/platform/superproject/+/1cdfff555f4a21f71ccc978290e2e212e2f8b168:frameworks/base/tools/aapt2/cmd/Link.cpp;l=335-352). And you can check the relevant list of no-compress extensions [here](https://cs.android.com/android/platform/superproject/+/1cdfff555f4a21f71ccc978290e2e212e2f8b168:frameworks/base/tools/aapt2/cmd/Link.cpp;l=2640-2649). (These links show an old commit instead of the latest one)

## Tauri dev mode does not update Android assets

Please run `yarn android:sync-assets` to sync the assets to the Android app before rebuilding the app.

## Safari ESM Backfill

Because we want to support macbooks as old as 2015, and because the system webview on these devices do not support modern importmap syntax, we need to use a backfill library: https://github.com/guybedford/es-module-shims

All templates must include this script through a CDN.

## Android Build Tools

We want to support Android version 8 and above. SDK version 26 and above.

This by itself should not require us to use outdated build tools. But the dev's laptop is really old so it's currently using the following settings:

* Min SDK: 24
* Target SDK: 36
* Compile SDK: 36
* Gradle: 8.14.3
* Kotlin: 1.9.25
* Android Gradle Plugin: 8.11.0

These versions were automatically chosen by Tauri's setup cli.

Due to concerns over supply chain security, we should avoid importing arbitrary Java and Kotlin dependencies. We should try to keep Rust and Node.js dependencies up to date with Rust stable and Node.js LTS version.