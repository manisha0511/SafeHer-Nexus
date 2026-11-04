# SafeHer Nexus Phase 7: Android APK/AAB Build & Release Preparation

**Date:** November 4, 2026  
**Auditor / Build Engineer:** Antigravity AI  
**Scope:** `SafeHer-Nexus-App` (Expo SDK 57, React Native 0.86, Android Gradle Plugin, Android SDK 36)  
**Status:** **RELEASE ARTIFACTS ASSEMBLED & VERIFIED**

---

## Executive Summary

Phase 7 successfully configured, asset-branded, prebuilt, and compiled both standalone Android release artifacts for the SafeHer Nexus mobile application. The build workflow utilized the native Gradle toolchain backed by Java 21 LTS and Android SDK 35/36 with Hermes JavaScript engine and C++ NDK 27.

Both target binary formats were produced cleanly and validated on disk:
1. **Standalone Preview APK (`app-release.apk` - 66.08 MB):** Configured for direct sideloading and physical-device installation without requiring Expo Go or app store overhead.
2. **Production Android App Bundle (`app-release.aab` - 45.40 MB):** Built with dynamic delivery optimization for Google Play Store release.

---

## 1. Release Classification Verdict

| Dimension | Classification | Evidence / Verification Details |
| :--- | :---: | :--- |
| **APK Build** | **`VERIFIED`** | `gradlew.bat assembleRelease` succeeded (`BUILD SUCCESSFUL`). Output: `app-release.apk` (69,298,132 bytes). |
| **APK Installation** | **`NOT TESTED`** | No active Android device or emulator currently attached to local `adb` daemon (`adb devices` returned 0 devices). |
| **AAB Build** | **`VERIFIED`** | `gradlew.bat bundleRelease` succeeded (`BUILD SUCCESSFUL`). Output: `app-release.aab` (47,608,540 bytes). |
| **Physical-Device Testing** | **`NOT TESTED`** | Standalone APK requires manual sideloading or USB debugging connection by device owner. |
| **Release Security** | **`VERIFIED`** | 100% free of backend credentials, API keys, database secrets, and signing tokens. |

---

## 2. Android Configuration & Identity

| Property | Value | Notes |
| :--- | :--- | :--- |
| **Application Name** | `SafeHer Nexus` | Configured in `app.json` and Android strings. |
| **Package Identifier** | `com.safehernexus.app` | Unique Android application namespace. |
| **Version Name** | `1.0.0` | Production release version. |
| **Version Code** | `1` | Monotonically increasing release integer. |
| **Target SDK** | `36` (Android 15 / QPR) | Meets latest Google Play requirements. |
| **Compile SDK** | `36` | Android SDK 36. |
| **Minimum SDK** | `24` (Android 7.0 Nougat) | Maximizes device compatibility across 98%+ active devices. |
| **JavaScript Engine** | Hermes | Bytecode precompiled for instant startup. |
| **Network Security** | `usesCleartextTraffic: true` | Enabled for preview builds to permit HTTP testing on LAN IP (`192.168.1.7:8080`). |

---

## 3. Brand Assets & Visual Identity

The following high-resolution assets were generated and integrated into `SafeHer-Nexus-App/assets/`:
- **Standard App Icon (`assets/icon.png`):** 1024 × 1024 px PNG featuring deep-slate shield with rose-indigo gradient beacon.
- **Adaptive Foreground Icon (`assets/adaptive-icon.png`):** 1024 × 1024 px transparent layer for Android adaptive launcher icon masks.
- **Splash Screen (`assets/splash.png`):** 1242 × 2436 px high-density splash featuring brand typography, version label, and central emblem.
- **Favicon (`assets/favicon.png`):** 48 × 48 px icon for web/browser fallbacks.

---

## 4. Permission Model Audit

Only strictly required permissions for personal safety and emergency dispatch are requested:

| Permission | Scope | Justification & User Impact |
| :--- | :---: | :--- |
| `android.permission.ACCESS_FINE_LOCATION` | Danger / Location | High-accuracy GPS coordinates for SOS distress events. |
| `android.permission.ACCESS_COARSE_LOCATION` | Location | Rapid approximate location when indoors or GPS is locked. |
| `android.permission.ACCESS_BACKGROUND_LOCATION` | Background | Continuous breadcrumb telemetry for emergency contacts while SOS is active. |
| `android.permission.VIBRATE` | Device Hardware | Haptic feedback when SOS countdown or trigger is activated. |
| `android.permission.CALL_PHONE` | Telephony | One-tap emergency dispatch dialing (112 / 1091). |
| `android.permission.INTERNET` | Connectivity | Secure TLS communication with SafeHer Nexus backend. |

> [!NOTE]
> **Zero Dangerous Telephony / SMS Permissions:** `SEND_SMS` and `READ_SMS` are **NOT** requested in the Android app. Emergency SMS dispatch is executed entirely by the backend Twilio service, completely insulating users from privacy concerns or intrusive Play Store SMS permission scrutiny.

---

## 5. Build Artifact Locations & Inspection

### 1. Preview APK (Direct Installation)
- **Relative Path:** `SafeHer-Nexus-App\android\app\build\outputs\apk\release\app-release.apk`
- **Absolute Path:** `C:\Users\Manisha\Downloads\Safeher Nexus\SafeHer-Nexus-App\android\app\build\outputs\apk\release\app-release.apk`
- **File Size:** `69,298,132 bytes` (~66.08 MB)
- **Signing Keystore:** Standard debug/preview keystore (`android/app/debug.keystore`)
- **Metadata:**
  ```json
  {
    "version": 3,
    "artifactType": { "type": "APK", "kind": "Directory" },
    "applicationId": "com.safehernexus.app",
    "variantName": "release",
    "versionCode": 1,
    "versionName": "1.0.0",
    "outputFile": "app-release.apk"
  }
  ```

### 2. Production Android App Bundle (Google Play Distribution)
- **Relative Path:** `SafeHer-Nexus-App\android\app\build\outputs\bundle\release\app-release.aab`
- **Absolute Path:** `C:\Users\Manisha\Downloads\Safeher Nexus\SafeHer-Nexus-App\android\app\build\outputs\bundle\release\app-release.aab`
- **File Size:** `47,608,540 bytes` (~45.40 MB)
- **Architecture Packaging:** Dynamic feature splits (arm64-v8a, armeabi-v7a, x86, x86_64)

---

## 6. Sideload Installation Instructions (How to Test)

To install and verify the preview APK on a physical Android phone:

### Method A: Direct Sideload via USB (ADB)
1. Enable **Developer Options** and **USB Debugging** on your Android smartphone.
2. Connect the phone to this computer via USB cable.
3. Open PowerShell and run:
   ```powershell
   & "C:\Users\Manisha\AppData\Local\Android\Sdk\platform-tools\adb.exe" install -r "C:\Users\Manisha\Downloads\Safeher Nexus\SafeHer-Nexus-App\android\app\build\outputs\apk\release\app-release.apk"
   ```
4. Accept the install prompt on your phone screen.

### Method B: Manual Transfer / Share
1. Copy `SafeHer-Nexus-App\android\app\build\outputs\apk\release\app-release.apk` to your phone via USB file transfer, Google Drive, WhatsApp, or local network share.
2. On your phone, tap the APK file in **Files / File Manager**.
3. Select **Install** (allow "Install from unknown sources" if prompted by Android).
4. Launch **SafeHer Nexus**.

---

## 7. Release Security & Secret Hygiene

- **Zero API Keys in Client:** No Twilio Account SID, Twilio Auth Token, Gemini API Key, or MySQL database passwords are baked into `app-release.apk` or `app-release.aab`.
- **JWT Protection:** JWT secret remains strictly inside the backend Spring Boot environment. The mobile app only handles ephemeral access tokens stored in `expo-secure-store`.
- **Hardware-Backed Keystore:** Session tokens in the release APK use native Android Keystore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.

---

## 8. Remaining Limitations & Recommendations

1. **Physical Device Battery Optimization:**
   - On aggressive battery-saving Android skins (MIUI/HyperOS, OxygenOS, OneUI), users should be prompted to set SafeHer Nexus to "Unrestricted" battery usage to ensure continuous background GPS tracking while walking late at night.
2. **Production Keystore for Google Play:**
   - While `app-release.apk` is signed with the preview key for instant testing, publishing `app-release.aab` to Google Play requires generating a dedicated production keystore (`keytool -genkey -v -keystore safeher-nexus-release.jks ...`) or enabling Google Play App Signing.
3. **No Automatic Uploads:**
   - As per strict instructions, the release artifacts are preserved locally and have not been uploaded or published to any external repository.
