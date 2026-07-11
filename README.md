This is a new project, work in progress.

To get started run:
```bash
cd tcms
yarn
yarn prepare
yarn workspace @tcms/app tauri android init
yarn workspace @tcms/app tauri ios init

# In order for Android Studio to access yarn, link it to the following directory
mkdir -p ~/.local/bin
ln -s $(which yarn) ~/.local/bin/yarn-tcms
```

Please also make sure you've defined the relevant ANDROID_NDK_HOME environment variables

```
export ANDROID_HOME="/path/to/your/android/sdk"
export ANDROID_NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 $ANDROID_HOME/ndk)"
export PATH="$PATH":$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/darwin-x86_64/bin:"$ANDROID_HOME"/platform-tools:"$HOME"/.local/bin
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

To verify the baseline correctness of all packages, templates, and the app, run:
```bash
yarn typecheck && yarn build && yarn test && echo '[tcms] all baseline correctness checks passed.'
```

Meanwhile, you can start the development server for the ThorCMS app:

For Desktop development, run:
```bash
yarn workspace @tcms/app tauri dev
```

For Android development, run:
```bash
yarn workspace @tcms/app tauri android dev
```

For iOS development, run:
```bash
yarn workspace @tcms/app tauri ios dev
```

To build the app bundle and estimate bundle size, run this and then open the `app/dist/bundle-size-analysis.html` file:
```bash
yarn workspace @tcms/app build
```
