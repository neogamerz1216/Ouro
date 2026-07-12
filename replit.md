# Ouro Browser

A fast, privacy-first desktop browser built with [Electron](https://www.electronjs.org/). Built by Pavan Tej Munagala & Team Ouro.

## Stack

- **Framework**: Electron 40
- **Bundler**: Browserify (browser JS) + custom concatenation (main process)
- **Styles**: Plain CSS, concatenated via custom build script
- **No external backend or database** — all data is stored in localStorage

## Project structure

| Path | Purpose |
|------|---------|
| `main/` | Electron main-process code (window management, menus, filtering, etc.) |
| `js/` | Renderer / browser UI JavaScript |
| `css/` | Stylesheets |
| `pages/` | Internal browser pages (new tab, settings, etc.) |
| `reader/` | Reader mode (Mozilla Readability integration) |
| `ext/` | Extension-like built-ins: ad filtering, HTTPS upgrade, public suffixes |
| `localization/` | i18n strings |
| `scripts/` | Build scripts (run via npm) |
| `dist/` | Build output (generated — don't edit manually) |

## How to build

```bash
npm run build
```

This runs four steps in order:
1. `buildMain` — concatenates main-process JS into `main.build.js`
2. `buildBrowser` — bundles renderer JS into `dist/bundle.js` via Browserify
3. `buildBrowserStyles` — concatenates CSS into `dist/bundle.css`
4. `buildPreload` — builds the Electron preload script

Use the **Build** workflow in Replit to trigger this with one click.

## Dev workflow (edit → build → test locally)

1. Edit files in `js/`, `css/`, `main/`, etc.
2. Run `npm run build` (or use the Build workflow)
3. To test the app locally on your own machine, build a distributable:
   - Windows: `npm run buildWindows`
   - Linux: `npm run buildDebian`
   - Mac Intel: `npm run buildMacIntel`
   - Mac ARM: `npm run buildMacArm`

> **Note**: Electron requires a native GUI — the app cannot run inside Replit's web preview. Build distributable installers and test on your local machine.

## Important: dragula dependency

The `dragula` package is specified as `github:minbrowser/dragula` in `package.json`. Replit's security policy blocks installing it via npm. After any `npm install`, you must restore it manually:

```bash
git clone https://github.com/minbrowser/dragula.git /tmp/dragula-src
cp -r /tmp/dragula-src/* node_modules/dragula/
```

This is already done in the current environment.

## User preferences

- User wants to update/modify the Ouro Browser app
