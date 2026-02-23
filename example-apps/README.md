# Venus npm Publish Smoke Tests

This folder contains three isolated apps to validate that `@wimmics/venus-webcomponents` works when installed directly from npm:

- `test/vanilla`
- `test/react`
- `test/angular`

Each app is independent and has its own `package.json`.

## Run

From each app folder:

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal.
