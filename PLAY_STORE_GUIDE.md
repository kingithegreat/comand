# Play Store Deployment Guide (TWA)

## 🚀 Release Night Checklist (2026-07-11)

Everything code-side is done and merged. Your remaining steps, in order:

1. **Deploy the fresh build** (new icons/splash must be live before wrapping):
   `npm ci && npm run build && firebase deploy --only hosting,firestore:rules`
2. **Generate the signing keystore** (once, keep it forever):
   `keytool -genkeypair -alias tacticalcommand -keyalg RSA -keysize 2048 -validity 10000 -keystore tacticalcommand.keystore`
3. **Get the SHA-256** (`keytool -list -v -keystore tacticalcommand.keystore -alias tacticalcommand`), paste it into `public/.well-known/assetlinks.json` replacing `YOUR_SHA256_FINGERPRINT_HERE`, then rebuild + redeploy hosting. Without this the app shows a browser URL bar.
4. **Build the AAB**: `npx @bubblewrap/cli init --manifest="https://gen-lang-client-0969027846.web.app/manifest.webmanifest"` then `npx @bubblewrap/cli build`
5. **Test the APK on your phone** — check the launcher icon (new amber reticle), boot splash, and that no URL bar appears.
6. **Play Console**: upload `app-release-bundle.aab`, use `public/feature-graphic.png` (1024×500) for the listing. Phone screenshots are **already generated** at `store-assets/screenshots/` (1080×1920, Play-compliant) — no need to grab them on-device. All listing copy, content-rating answers, and Data safety form answers are pre-written in `store-assets/LISTING.md`.
7. **Required URLs** (both pages ship with the hosting deploy in step 1):
   - Privacy policy: `https://gen-lang-client-0969027846.web.app/privacy-policy.html`
   - Account deletion: `https://gen-lang-client-0969027846.web.app/account-deletion.html`
   Paste the privacy URL into Store listing → Privacy policy, and the deletion URL into the Data safety form's account-deletion field.

Store listing copy suggestion:
> **Short:** Turn-based tactics. Build a squad, outsmart the enemy.
> **Full:** Command your squad in fast turn-based tactical battles. Pick from unique unit archetypes, use fog of war and capture-the-flag mutators, fight the campaign solo or battle friends online with room codes. A full 3D battlefield in your pocket.

---


Your app is wrapped as a Trusted Web Activity — Chrome renders your PWA full-screen inside an Android app shell. No WebView, no native code needed.

## Prerequisites

- Node.js 18+
- Java JDK 11+ (for signing)
- A [Google Play Console](https://play.google.com/console) account ($25 one-time fee)

## Steps

### 1. Install Bubblewrap

```bash
npm i -g @bubblewrap/cli
# OR use npx:
npx @bubblewrap/cli --help
```

### 2. Deploy your PWA first

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

Verify your PWA is live at: `https://gen-lang-client-0969027846.web.app`

### 3. Generate the Android project

```bash
npx @bubblewrap/cli init --manifest="https://gen-lang-client-0969027846.web.app/manifest.webmanifest"
```

This reads `twa-manifest.json` and creates an Android project in the current directory.

### 4. Generate signing key

```bash
keytool -genkeypair -alias tacticalcommand -keyalg RSA -keysize 2048 -validity 10000 -keystore tacticalcommand.keystore
```

Save this keystore file safely — you need it for every update.

### 5. Get your SHA-256 fingerprint

```bash
keytool -list -v -keystore tacticalcommand.keystore -alias tacticalcommand
```

Copy the SHA-256 fingerprint and paste it into `public/.well-known/assetlinks.json`, replacing `YOUR_SHA256_FINGERPRINT_HERE`.

Then redeploy:
```bash
npm run build && firebase deploy --only hosting,firestore:rules
```

### 6. Build the APK/AAB

```bash
npx @bubblewrap/cli build
```

This produces:
- `app-release-signed.apk` — for testing
- `app-release-bundle.aab` — for Play Store upload

### 7. Test the APK

```bash
adb install app-release-signed.apk
```

Or transfer the APK to your phone and install it.

### 8. Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app → Game → Free
3. Fill in the store listing (title, description, screenshots)
4. Upload `app-release-bundle.aab` to Production or Internal Testing
5. Complete the content rating questionnaire
6. Set up pricing & distribution
7. Submit for review

## Store Listing Suggestions

- **Title**: Tactical Command
- **Short description**: Turn-based tactical combat. Build squads and outmaneuver your opponent.
- **Category**: Strategy / Board
- **Content rating**: Everyone 10+ (fantasy violence)

## Troubleshooting

**Chrome address bar showing?** The Digital Asset Links verification failed. Check:
- `assetlinks.json` is accessible at `https://gen-lang-client-0969027846.web.app/.well-known/assetlinks.json`
- The SHA-256 fingerprint matches your signing key exactly
- You redeployed after updating the fingerprint

**App crashes on launch?** Ensure Chrome is installed and updated on the device. TWA requires Chrome 72+.
