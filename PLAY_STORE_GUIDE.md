# Play Store Deployment Guide (TWA)

Your app is wrapped as a Trusted Web Activity — Chrome renders your PWA full-screen inside an Android app shell. No WebView, no native code needed.

## Prerequisites

- Node.js 18+
- Java JDK 11+ (for signing)
- A [Google Play Console](https://play.google.com/console) account ($25 one-time fee)

## Steps

### 1. Install Bubblewrap

```bash
npm i -g @nicksinger/nicksinger-bubblewrap-cli
# OR use npx:
npx @nicksinger/nicksinger-bubblewrap-cli --help
```

### 2. Deploy your PWA first

```bash
npm run build
firebase deploy --only hosting
```

Verify your PWA is live at: `https://gen-lang-client-0969027846.web.app`

### 3. Generate the Android project

```bash
npx bubblewrap init --manifest="https://gen-lang-client-0969027846.web.app/manifest.json"
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
npm run build && firebase deploy --only hosting
```

### 6. Build the APK/AAB

```bash
npx bubblewrap build
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
