This is a new project, work in progress.

To get started run:
```bash
cd pcms
yarn
yarn prepare
yarn workspace @pcms/app tauri android init
yarn workspace @pcms/app tauri ios init
```

Then you must build the util packages and website templates:
```bash
yarn build
yarn test
```

Then, you can start the development server for the PCMS app:

For Desktop development, run:
```bash
yarn workspace @pcms/app tauri dev
```

For Android development, run:
```bash
yarn workspace @pcms/app tauri android dev
```

For iOS development, run:
```bash
yarn workspace @pcms/app tauri ios dev
```