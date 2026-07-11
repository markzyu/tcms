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