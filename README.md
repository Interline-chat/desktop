# Interline Desktop

Thin Electron shell for [app.interline.chat](https://app.interline.chat) on macOS and Windows. The React app is **not** bundled: the shell loads the live origin, so UI changes ship through the normal webapp deploy. A desktop release is only needed when the shell itself changes.

## Development

```bash
npm install
INTERLINE_URL=http://localhost:5173 npm run dev   # unpackaged builds only; packaged builds always load production
npm start                                          # production URL
```

`INTERLINE_URL` is ignored in packaged builds. Don't commit dev or staging URLs.

## What the shell does

- Single instance; window size and position persist across launches.
- Closing the window hides it to the tray. The tray menu has **Open Interline** and **Quit**.
- Notifications use the web `Notification` API from the app, which Electron shows natively. Permission is granted only to the app origin.
- The dock badge (macOS) or taskbar overlay (Windows) follows the unread count in `document.title`.
- Auto-update via `electron-updater` from this repo's GitHub Releases. The repo is public, so the updater needs no token.

## Client contract

The client depends on these behaviours. Any change here must land together with the matching change to `src/lib/desktop.ts` in the client.

| Contract | Shell side | Client side |
| --- | --- | --- |
| Detection | UA is Chromium's default with `Electron/x.y` removed and `InterlineDesktop/<version>` appended | `navigator.userAgent.includes('InterlineDesktop/')` → `isDesktop`, `desktopVersion` |
| Link routing | `window.open` / `target="_blank"`: same origin → in-app, other origins → system browser | Plain anchors; nothing special |
| Browser-only flows | Same-origin paths under `/settings/channels/` always open in the system browser (`EXTERNAL_PATHS` in `src/main.js`) | WhatsApp signup and email connect buttons link there with `target="_blank"` when `isDesktop` |
| Unread count | Parses a leading `(n)` from the page title | Keeps `document.title` as `(n) …` |
| Notifications | Allows `Notification` for the app origin only | Fires notifications from Pusher events; hides the service-worker / Beams prompt when `isDesktop` |
| `interline://` (Path B only) | Not registered yet | Not used yet |

## Releasing

1. Bump `version` in `package.json` and commit to `main`.
2. Tag and push: `git tag v0.1.0 && git push origin v0.1.0`.
3. The **Release** workflow builds a signed and notarized universal DMG and a signed NSIS installer, then publishes them to GitHub Releases. Installed apps pick up the update on their next launch.

### Required configuration

Store these in a GitHub Environment named `release` with required reviewers, never as repo-wide secrets.

| Secret | Purpose |
| --- | --- |
| `MAC_CERT_P12_BASE64`, `MAC_CERT_PASSWORD` | Developer ID Application certificate |
| `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | Notarization |
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` | Azure Trusted Signing service principal |

| Variable | Purpose |
| --- | --- |
| `AZURE_PUBLISHER_NAME` | Must match the certificate subject CN |
| `AZURE_SIGNING_ENDPOINT` | e.g. `https://eus.codesigning.azure.net/` |
| `AZURE_SIGNING_ACCOUNT`, `AZURE_CERT_PROFILE` | Trusted Signing account and certificate profile |

## TODO before the first release

- Real app icons: `build/icon.icns`, `build/icon.ico`, plus `build/tray.png` (16×16 template image, `@2x` variant) and `build/badge-overlay.png`. The current PNGs are placeholders.
- Phase 0 spike: cookie login, Turnstile, Pusher, and the hosted Google button on `/login`, on both OSes.
- Check that clicking a notification brings the window to the front. If the client's `onclick` calling `window.focus()` isn't enough, add a minimal preload bridge.
