# ChhadKrishi Android app (APK) — step-by-step guide

This guide turns the existing ChhadKrishi website into an installable Android app **without
replacing or forking the website**. The website stays the single source of truth; the app is a
native Android shell around it.

---

## 1. Choosing the approach

ChhadKrishi is not a static site. It depends on things that only run on a server:

- Next.js server components and `src/app/api/*` routes (chat, photo analysis, shop, care, designer)
- Better Auth sessions (cookies) and the `src/proxy.ts` gate
- Postgres via `DATABASE_URL`, AI providers (Groq, Google, OpenRouter), the ML service
- Secrets that must never ship inside an APK

| Option | What it is | Verdict for ChhadKrishi |
| --- | --- | --- |
| **Capacitor shell loading the live site** | A native Android project (Capacitor) whose WebView opens your deployed Vercel URL. Native permissions, icon, splash screen, back button, offline page. | **Recommended.** Zero rewrite, every feature keeps working, app updates the moment you deploy the website, and you can add native plugins later (push notifications, share, etc.). |
| Trusted Web Activity (Bubblewrap / PWABuilder) | Opens the site in full-screen Chrome. Needs a PWA manifest and a Digital Asset Links file. | Good fast alternative (see §12). Less native control; needs Chrome on the device. |
| Capacitor with `next build` static export | Bundles the HTML/JS inside the APK. | **Not possible** without a big refactor: API routes, server components, the proxy and auth don't exist in a static export, and API keys can't go in an APK. |
| React Native / Expo / Flutter rewrite | A new native app talking to your API. | Best "feel", but a full rewrite of every screen in both languages. Not worth it now. |

**Decision: Capacitor (remote-URL mode).** Tools you'll use:

- **Capacitor** (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) — the native shell
- **Android Studio** — Android SDK, emulator, Gradle, signing
- **JDK 21** (bundled with Android Studio)
- **@capacitor/assets** — generates every icon/splash size from one image
- **Vercel** — hosts the website the app loads (already in place)

---

## 2. Prerequisites (one-time, on Windows)

1. **Node.js 22+** (`node -v`).
2. **Android Studio** (latest stable) from <https://developer.android.com/studio>. During setup
   install: *Android SDK*, *Android SDK Platform* (latest API level), *Android SDK Build-Tools*,
   *Android SDK Platform-Tools*, and an *Android Virtual Device* (emulator).
3. **Environment variables** (System Properties → Environment Variables):
   - `JAVA_HOME` = `C:\Program Files\Android\Android Studio\jbr`
   - `ANDROID_HOME` = `C:\Users\<you>\AppData\Local\Android\Sdk`
   - Add `%ANDROID_HOME%\platform-tools` to `Path` (gives you `adb`).
   Open a **new** terminal and check: `java -version` (21) and `adb version`.
4. **The website deployed on HTTPS**, e.g. `https://chhadkrishi.vercel.app` (or your custom
   domain), with sign-in, chat, shop and photo analysis working in a phone browser. The app is
   only as good as the mobile website, so test it in Chrome on your phone first.
5. A phone with **Developer options → USB debugging** enabled (Settings → About phone → tap
   *Build number* 7 times).

---

## 3. Prepare the website (small, recommended)

These make the site feel native inside the app and are also needed for the TWA option.

1. **Web app manifest** — create `src/app/manifest.ts`:

   ```ts
   import type { MetadataRoute } from "next";

   export default function manifest(): MetadataRoute.Manifest {
     return {
       name: "ChhadKrishi — ছাদকৃষি",
       short_name: "ChhadKrishi",
       start_url: "/",
       display: "standalone",
       background_color: "#fbfcf6",
       theme_color: "#fbfcf6",
       icons: [
         { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
         { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
         { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
       ],
     };
   }
   ```

   Export the three PNGs from `public/logo.png` (maskable = logo centred on a solid square with
   ~20% padding). Check the Next 16 docs in `node_modules/next/dist/docs/` for the manifest file
   convention before adding it.
2. **Safe areas** — add `viewportFit: "cover"` to the `viewport` export in `src/app/layout.tsx`
   and use `env(safe-area-inset-top/bottom)` padding on the sticky header and bottom bars so
   nothing hides under the status bar or gesture bar.
3. **Deploy** the site to Vercel production.

Nothing about auth changes: the app loads the same origin as the website, so `BETTER_AUTH_URL`
and cookies keep working as they are.

---

## 4. Create the mobile shell project

Keep the native project in its own folder with its own `package.json` so it never affects the
Vercel build.

```bash
# from the repo root
mkdir mobile
cd mobile
npm init -y
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli @capacitor/assets typescript
npx cap init ChhadKrishi bd.chhadkrishi.app --web-dir www
```

- `bd.chhadkrishi.app` is the **application ID**. It is permanent on the Play Store — pick it
  carefully (reverse-domain style, lowercase).

Create the offline fallback page `mobile/www/index.html` (shown if the site can't load):

```html
<!doctype html>
<html lang="bn">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>ChhadKrishi</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fbfcf6;
             font-family: system-ui, sans-serif; color: #1f3d2b; text-align: center; padding: 24px; }
      button { margin-top: 16px; padding: 12px 24px; border: 0; border-radius: 999px;
               background: #2f6b3f; color: #fff; font-size: 16px; }
    </style>
  </head>
  <body>
    <div>
      <h1>ইন্টারনেট সংযোগ নেই</h1>
      <p>No internet connection. Please check your connection and try again.</p>
      <button onclick="location.href='https://chhadkrishi.vercel.app'">আবার চেষ্টা করুন / Retry</button>
    </div>
  </body>
</html>
```

---

## 5. Configure Capacitor

Replace the generated `mobile/capacitor.config.ts` (use your real production URL):

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "bd.chhadkrishi.app",
  appName: "ChhadKrishi",
  webDir: "www",
  server: {
    // The app opens the live website; deploying the site updates the app.
    url: "https://chhadkrishi.vercel.app",
    // Pages outside this list open in the system browser instead of the app.
    allowNavigation: ["chhadkrishi.vercel.app"],
    // Shown when the site can't be reached.
    errorPath: "index.html",
  },
  android: {
    // Lets you debug the WebView from chrome://inspect. Set false for the Play Store build.
    webContentsDebuggingEnabled: true,
  },
};

export default config;
```

**Important — keep the root build clean.** The root `tsconfig.json` includes `**/*.ts`, so
`next build` would try to type-check `mobile/capacitor.config.ts` and fail on Vercel. Add
`"mobile"` to the root `tsconfig.json` `"exclude"` array, and add `"mobile/**"` to the ignores
in `eslint.config.mjs`.

---

## 6. Add the Android platform and permissions

```bash
cd mobile
npx cap add android
npx cap sync android
```

This creates `mobile/android/` — a normal Android Studio project.

ChhadKrishi uses the **camera** (plant photos via `<input capture>`) and the **microphone**
(voice input via `getUserMedia` in `src/components/chat/voice.tsx`). Open
`mobile/android/app/src/main/AndroidManifest.xml` and make sure these are present above
`<application>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

Capacitor's WebView asks the user for these at runtime the first time the site requests them,
just like Chrome does.

---

## 7. App icon and splash screen

1. Create `mobile/assets/` with:
   - `icon-only.png` — 1024×1024, the logo
   - `icon-foreground.png` + `icon-background.png` — 1024×1024 (adaptive icon layers)
   - `splash.png` and `splash-dark.png` — 2732×2732, logo centred on `#fbfcf6`
2. Generate every Android size:

   ```bash
   npx capacitor-assets generate --android
   ```

3. Native plugins:

   ```bash
   npm install @capacitor/app @capacitor/splash-screen @capacitor/status-bar
   npx cap sync android
   ```

   `@capacitor/app` matters: with it installed, the Android **back button** goes back through
   the site's history and only exits the app on the first page (without it, back closes the app
   immediately). Configure the others under `plugins` in `capacitor.config.ts` (e.g. splash
   `backgroundColor: "#fbfcf6"`, `launchShowDuration: 1000`).

---

## 8. Run it on a phone or emulator

```bash
cd mobile
npx cap run android          # pick your USB phone or an emulator
# or open the project in Android Studio and press ▶ Run
npx cap open android
```

Test the full checklist inside the app:

- [ ] Sign up / sign in, then close and reopen the app — still signed in
- [ ] AI chat, voice input (mic permission prompt appears)
- [ ] Photo analysis with the camera and from the gallery
- [ ] Shop: filters, photos, add to cart, checkout, orders
- [ ] Bangla/English switch, care routine, garden, designer
- [ ] Airplane mode → offline page appears → Retry works
- [ ] Back button behaviour, rotation, dark status bar contrast

Debug the WebView from desktop Chrome at `chrome://inspect` (console, network, layout).

**Testing against your local dev server** (optional): temporarily set
`server.url: "http://<your-PC-LAN-IP>:3000"` and `server.cleartext: true`, and start the site
with `BETTER_AUTH_URL=http://<your-PC-LAN-IP>:3000` — otherwise Better Auth rejects sign-in
with `INVALID_ORIGIN`. Revert both before building a release.

---

## 9. Build a debug APK (for quick sharing/testing)

```bash
cd mobile/android
gradlew.bat assembleDebug
```

Output: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

Install it: `adb install -r app/build/outputs/apk/debug/app-debug.apk`, or send the file to a
phone and open it (allow *Install unknown apps*). Debug APKs are not for the Play Store.

---

## 10. Build the signed release APK (final)

### 10.1 Create a signing key (once — back it up!)

```bash
keytool -genkeypair -v -keystore chhadkrishi-release.jks -alias chhadkrishi ^
  -keyalg RSA -keysize 2048 -validity 10000
```

Store `chhadkrishi-release.jks` and its passwords **outside the repo** (e.g. a password
manager). If you lose it you can never update the app on the Play Store under the same listing.

### 10.2 Tell Gradle about it

Create `mobile/android/keystore.properties` (add it to `.gitignore`):

```properties
storeFile=C:/keys/chhadkrishi-release.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=chhadkrishi
keyPassword=YOUR_KEY_PASSWORD
```

In `mobile/android/app/build.gradle` add, inside `android { … }`:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

signingConfigs {
    release {
        storeFile keystoreProperties["storeFile"] ? file(keystoreProperties["storeFile"]) : null
        storePassword keystoreProperties["storePassword"]
        keyAlias keystoreProperties["keyAlias"]
        keyPassword keystoreProperties["keyPassword"]
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

Set the version in `defaultConfig`: `versionCode 1` (integer, +1 on every release) and
`versionName "1.0.0"`. Set `webContentsDebuggingEnabled: false` in `capacitor.config.ts` and run
`npx cap sync android`.

### 10.3 Build

```bash
cd mobile/android
gradlew.bat assembleRelease     # → app/build/outputs/apk/release/app-release.apk
gradlew.bat bundleRelease       # → app/build/outputs/bundle/release/app-release.aab (Play Store)
```

(Android Studio alternative: **Build → Generate Signed App Bundle / APK…**, choose APK or
Android App Bundle, select the keystore, *release*.)

`app-release.apk` is the **final APK** to share or sideload. The Play Store requires the
`.aab` file instead.

---

## 11. Updating the app

- **Website changes** (features, shop products, text, styling): just deploy to Vercel. The app
  shows them on next launch — no new APK.
- **Native changes** (permissions, icon, splash, plugins, `capacitor.config.ts`): run
  `npx cap sync android`, bump `versionCode`/`versionName`, rebuild the release APK/AAB.

### Publishing to Google Play (optional)

1. Create a Play Console developer account (one-time fee).
2. Create the app, fill in the store listing (Bangla + English), privacy policy URL (required —
   the app uses camera, mic and accounts), data-safety form and content rating.
3. Upload `app-release.aab` to *Internal testing* first, then *Production*.
4. Play's "minimum functionality" policy rejects thin website wrappers. ChhadKrishi's camera
   diagnosis, voice chat, accounts and offline page help; native push reminders for the care
   routine (`@capacitor/push-notifications` + Firebase) would strengthen it further.

---

## 12. Alternative: Trusted Web Activity (fastest path)

If you only need an APK quickly and don't need native plugins:

1. Complete §3 (manifest + icons) and deploy.
2. Go to <https://www.pwabuilder.com>, enter the site URL, choose **Android → Generate**.
   (CLI alternative: `npm i -g @bubblewrap/cli` → `bubblewrap init --manifest
   https://<site>/manifest.webmanifest` → `bubblewrap build`.)
3. It produces a signed APK/AAB plus an `assetlinks.json`. Put that file at
   `public/.well-known/assetlinks.json` and deploy — this removes the browser URL bar.

Trade-offs: requires Chrome on the device, less control over offline/native behaviour.

---

## 13. Troubleshooting

| Problem | Fix |
| --- | --- |
| White/blank screen | `server.url` wrong or not HTTPS; open `chrome://inspect` and check the console. |
| Sign-in fails with `INVALID_ORIGIN` | The page origin doesn't match `BETTER_AUTH_URL` (common with LAN testing). |
| Google/OAuth sign-in blocked ("disallowed_useragent") | Google blocks OAuth inside WebViews; keep email/password, or open OAuth in the system browser (`@capacitor/browser`) with a deep link back. |
| Mic or camera does nothing | Permissions missing in `AndroidManifest.xml`, or denied — clear app data and retry. |
| Links open inside the app unexpectedly / not at all | Adjust `server.allowNavigation`. |
| `next build` fails on Vercel after adding `mobile/` | Exclude `mobile` in the root `tsconfig.json` and ESLint config (§5). |
| Gradle: "JAVA_HOME is not set" / wrong Java | Point `JAVA_HOME` to Android Studio's `jbr` (JDK 21). |
| `SDK location not found` | Create `mobile/android/local.properties` with `sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk`. |
