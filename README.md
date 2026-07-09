This is a new project, work in progress.

To get started run:
```bash
cd tcms
yarn
yarn prepare
yarn workspace @tcms/app tauri android init
yarn workspace @tcms/app tauri ios init
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
