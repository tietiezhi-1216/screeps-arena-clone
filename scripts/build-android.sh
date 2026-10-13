#!/bin/bash
# 用法：APP_VERSION=0.2.0 VERSION_CODE=20 ./scripts/build-android.sh  → 生成未签名 release APK（流程沿用 screeps-blockly-mobile）
set -e
if [ -z "$JAVA_HOME" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then J=$(ls -d "$HOME"/sdk/jdk-17* 2>/dev/null | head -1); [ -n "$J" ] && export JAVA_HOME="$J"; fi
if [ -z "$ANDROID_HOME" ] && [ -d "$HOME/sdk/android" ]; then export ANDROID_HOME="$HOME/sdk/android"; fi
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}" PATH="$JAVA_HOME/bin:$PATH"
: "${APP_VERSION:?}" "${VERSION_CODE:?}"
./scripts/prepare.sh
rm -rf android && npx cap add android && npx cap sync android
cp -r android-res/. android/app/src/main/res/
rm -f android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml android/app/src/main/res/drawable/ic_launcher_background.xml
sed -i "s/versionCode 1$/versionCode $VERSION_CODE/; s/versionName \"1.0\"/versionName \"$APP_VERSION\"/" android/app/build.gradle
# 沉浸式全屏 + 固定 WebView 文字缩放；横竖屏都支持（跟随系统旋转）
cat > android/app/src/main/java/com/tietiezhi/screepsarena/MainActivity.java <<'JAVA'
package com.tietiezhi.screepsarena;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().getSettings().setTextZoom(100);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        hideSystemBars();
    }
    private void hideSystemBars() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }
    @Override public void onResume() { super.onResume(); hideSystemBars(); }
    @Override public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus) hideSystemBars(); }
}
JAVA
sed -i 's/<activity/<activity android:screenOrientation="fullUser"/' android/app/src/main/AndroidManifest.xml
grep -E "versionCode|versionName" android/app/build.gradle
(cd android && ./gradlew assembleRelease --no-daemon -q)
