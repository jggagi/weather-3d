# Weather 3D — Agent Handoff Guide 🌦️

This file serves as the context-building brief and implementation guide for coding agents modifying the **Weather 3D** visualization dashboard.

---

## 1. Product Shape
- **Core Experience**: A beautiful, premium 3D weather simulation dashboard rendering animated celestial bodies, real-time climate telemetry, and fluid meteorological particles.
- **Frontend Tech**: React + Vite pipeline utilizing Three.js / React Three Fiber for WebGL rendering, Tailwind CSS/CSS variables, and Lucide icons.

---

## 2. Directory Structure
- **Physical Path**: `/Users/guoq/opc/weather-3d/`
- **Main Files**:
  - `src/`: Main React component source folders.
  - `dist/`: Target build directory containing highly optimized SPA assets (`index.html`, compiled JS/CSS) served by the OPC server.
  - `package.json`: Node dependencies (vite, react, three, @react-three/fiber).
  - `opc.config.json`: Host config mapping static directory to the server.

---

## 3. Deployment & Host Mapping
- **Type**: `static`
- **OPC Gateway Route**: `http://home.lab/weather-3d/`
- **Config Override**: Managed by `opc.config.json` (auto-detects and serves from `dist/` subdirectory):
  ```json
  {
    "name": "Weather 3D",
    "emoji": "🌦️",
    "description": "3D Weather Visualization Dashboard",
    "type": "static",
    "route": "/weather-3d",
    "servePath": "dist"
  }
  ```

---

## 4. Coding Agent Modification Rules
> [!IMPORTANT]
> 1. **Vite Rebuilds**: After modifying code under `src/`, coding agents must rebuild the production bundle to compile the updated assets:
>    ```bash
>    npm run build
>    ```
> 2. **Proxy-safe relative paths**: Ensure `vite.config.ts` specifies a base path matching the proxy route (or relative base `./`) to guarantee compiled CSS/JS paths resolve perfectly under the dashboard routing.
