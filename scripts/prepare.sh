#!/bin/sh
# 把引擎、示例 bot、图标、Capacitor 运行时拷进 www（Capacitor 的 webDir）
set -e
rm -rf www/src www/bots www/vendor && mkdir -p www/vendor
cp -r src www/src && cp -r bots www/bots && cp assets/icon.svg www/icon.svg
cp node_modules/@capacitor/core/dist/capacitor.js www/vendor/capacitor.js
echo "window.APP_VERSION='${APP_VERSION:-0.0.0}';" > www/version.js
