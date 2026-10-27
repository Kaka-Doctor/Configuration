# AppCraft Studio — Android PWA & App Creator

A visual builder for Android apps. Design the logo, splash screen, top bar, menus and
launchpad, then get **real, buildable output**:

| Output | What it is |
| --- | --- |
| **GitHub repo export** | A complete Android project + `.github/workflows/build-apk.yml`. Pushing it makes GitHub build a signed, installable `.apk` and a Play-ready `.aab`, published to Releases. |
| **Android Studio export** | The same project as a ZIP you can open, sync and Run in Android Studio (Gradle wrapper included). |
| **PWA export** | `index.html` + `manifest.webmanifest` + `sw.js` + PNG icons, ready for GitHub Pages / Netlify. |
| **Instant phone preview** | A QR code that opens this studio on your phone, where it can be installed as a PWA. |

### Honest limits

- A web browser **cannot compile Android binaries**. The studio creates the source and
  the CI pipeline; GitHub's servers do the actual Gradle build.
- A browser **cannot generate a valid signing key**. Upload your own keystore (Keystore
  tab) or let CI use the debug key. `SIGNING.txt` and the generated README explain both.
- No fake APKs, certificates or fingerprints are ever produced.

---

## Run locally

Requires **Node.js 20.19+** (22 LTS recommended).

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build
npm test           # unit tests for the generators
npm run typecheck  # TypeScript, no emit
npm run icons      # regenerate the studio's own PWA icons
npm run wrapper    # re-download the embedded Gradle wrapper (advanced)
```

> Windows tip: if the folder path contains `&`, `npm run …` may fail because of shell
> quoting. Clone it to a path without `&` (for example `C:\dev\appcraft`).

---

## Deploy to Netlify

`netlify.toml` is already configured:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 22
- SPA fallback and long-lived caching for hashed assets

Connect the repository in Netlify (or drag the folder into Netlify Drop) and it builds
without any environment variables. The site is static except for one optional Netlify
Function (`netlify/functions/deploy.mjs`) used by the **Deploy** tab; without the relay
variables below that function simply reports "setup needed" and everything else works.

### One-click APK/AAB deploy relay

The **Deploy** tab sends the whole generated project to a small relay repository you own.
The relay's GitHub Actions workflow builds the APK and AAB, publishes them as a GitHub
Release, then deletes the branch. The Release is permanent, so the download link never
expires, and the finished build stays listed under the phone preview in the studio.

1. Create a **public** GitHub repository, e.g. `<you>/appcraft-build-relay`
   (public = free Actions minutes; a private repo stops building once its minutes run out).
2. Add `.github/workflows/deploy-relay.yml` — download the exact file from the Deploy tab.
3. Create a fine-grained token limited to that repository with `Contents: Read and write`,
   `Actions: Read and write`, `Metadata: Read`.
4. In Netlify → Site configuration → Environment variables, add:

   ```text
   GITHUB_RELAY_REPO=<you>/appcraft-build-relay
   GITHUB_RELAY_TOKEN=github_pat_...
   GITHUB_RELAY_BRANCH=main
   GITHUB_RELAY_WORKFLOW=deploy-relay.yml
   DEPLOY_ACCESS_CODE=optional-shared-code
   ```

5. Redeploy the site. The Deploy tab shows **READY**.

The token is used only by the Netlify Function; the browser never sees it. The uploaded
ZIP lives on a throwaway branch for the length of the build and is deleted afterwards
(so on a public relay it is briefly public — use a private repo if that matters to you).


---

## Get an installable APK

1. In the studio, click **Build & Test App**.
2. Download **GitHub repository (.zip)**, unzip it, and push it:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

3. In the repo, open **Actions → Build Android APK & AAB**. The workflow installs JDK 17
   (or 21, matching your SDK tab), the Android SDK and Gradle, then runs
   `assembleDebug` and `bundleRelease`.
4. Download the APK:

   ```
   https://github.com/<you>/<repo>/releases/latest/download/<slug>-v<version>.apk
   ```

   Enter `<you>/<repo>` in the Build & Test dialog to get this link as a button.
5. On the phone, allow "Install unknown apps" for the browser/file manager, then open the
   downloaded APK.

### Signing

- Default: the **debug key** — fine for testing, not for Play updates.
- Upload your own `.jks`/`.keystore` in the **Keystore & Signing** tab. It is bundled only
  in the Android Studio export, never in the GitHub export.
- For CI, add `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` as
  repository secrets (Settings → Secrets and variables → Actions). The workflow then signs
  the release build with your key.

---

## Open in Android Studio

1. **Android Studio → File → Open…** and select the unzipped folder.
2. Wait for the Gradle sync. The project pins **Gradle 8.11.1**, **AGP 8.9.1** and
   **Kotlin 2.1.20**; the wrapper is included, so nothing else needs installing.
3. Press **Run ▶**, or use **Build → Generate Signed Bundle / APK…**.

Command line:

```bash
chmod +x gradlew          # macOS/Linux
./gradlew :app:assembleDebug
./gradlew :app:bundleRelease
```

---

## Project layout

```
src/
  App.tsx                       studio shell, tab navigation, modals
  components/
    DeviceSimulator.tsx         live Android phone preview
    common/ImageUploadField.tsx device image upload + resize
    editor/                     per-section editors (branding, splash, menu, SDK, AdMob…)
  utils/
    appGenerator.ts             web/PWA generators + ZIP assembly
    androidProject.ts           Gradle, manifest, Kotlin, resources, CI workflow, README
    iconRenderer.ts             PNG launcher + PWA icon rendering
    keystoreGenerator.ts        real keystore handling (upload only)
    exportService.ts            downloads and GitHub release links
    gradleWrapperData.ts        embedded official Gradle wrapper (generated)
scripts/
  generate-icons.mjs            studio PWA icons
  fetch-gradle-wrapper.mjs      regenerates gradleWrapperData.ts
  ts-resolver.mjs               lets `node --test` import the app's TS modules
```

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| GitHub Actions build fails with "SDK licence not accepted" | Re-run the workflow; the license step is idempotent. |
| APK link is 404 | The release only exists after the first successful workflow run. |
| Play Console rejects the AAB | Add the signing secrets above and bump `versionCode`. |
| Images disappear after reload | Browser storage is full — the studio shows a red warning; remove a large image. |
| Gradle sync asks for a wrapper | Use the included `gradlew` / `gradlew.bat`; do not delete `gradle/wrapper/`. |
