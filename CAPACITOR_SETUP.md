# Capacitor Android Setup Guide for SyncMate

## 1. Native GPS & Internet Permissions
When `npx cap add android` is executed to generate the `android/` project, ensure that `android/app/src/main/AndroidManifest.xml` includes the following native location and network permissions inside the `<manifest>` tag:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

## 2. Available Capacitor Scripts
- **Build Web Assets & Sync with Native**:
  `npm run cap:build`
- **Add Android Platform**:
  `npm run cap:android`
