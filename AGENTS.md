# Development scope and launch contract

- Only edit files inside this directory and its descendants.
- Keep the root `一键启动.cmd` as the permanent Windows double-click entry point. The application is in `internet-wanderer/`.
- The launcher runs the plain Node.js file `internet-wanderer/scripts/start.mjs`, which starts the current source using Vite's development-server API and the current `vite.config.ts`. Keep this entry point working. If the framework or directory layout changes, update the launcher in the same change.
- Keep the launcher free of PowerShell execution-policy overrides, encoded scripts, and remote script execution. Leave antivirus protection enabled; investigate a security alert before restoring a deleted script.
- Keep `package.json` and `package-lock.json` in sync. Dependency installation, cache, temporary files, and launcher test output must remain inside the project. Do not require a global npm package or rely on an old `dist/` build.
- Keep the launch address `http://127.0.0.1:5173/` and the launcher identity/process headers. A different browser origin has different local favorites and recent encounters. The development server must run in the launcher process so stopping it releases the port.
- Before delivering each iteration, run `npm run build` and `npm run test:launcher`. Close an existing project window before running the launch lifecycle test. Every iteration must preserve the double-click launch contract; record any validation that could not be completed.
