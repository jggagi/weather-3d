# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Weather request recovery

City searches, coordinate refreshes, and startup location detection share a
latest-request controller. A newer request invalidates older callbacks, so a
late geolocation result, network success, or error cannot replace the selected
location. Existing weather stays visible when refresh fails. If the first
load fails before weather is available, the empty state includes a Retry
button.

Run the request-controller tests without making provider requests:

```bash
node --test tests/request-controller.test.js
```

## Provider data and location state

Weather values are forecast data from Open-Meteo. The interface shows the timestamp supplied by the provider; after a refresh failure it keeps the last received data visible and labels it as previous data. A city search changes the current in-memory view only: location and forecast are not saved between launches.

Development/build scripts preserve the logical dependency path and use Vite's native config loader, including when node_modules is a migrated directory symlink. The Vite resolver follows that same logical path; no dependencies or global Node options are changed by these scripts.
