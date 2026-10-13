#!/bin/sh
# 把引擎、示例 bot、图标、Capacitor 运行时拷进 www（Capacitor 的 webDir）
set -e
rm -rf www/src www/bots www/vendor && mkdir -p www/vendor
cp -r src www/src && cp -r bots www/bots && cp assets/icon.svg www/icon.svg
cp node_modules/@capacitor/core/dist/capacitor.js www/vendor/capacitor.js
cp node_modules/blockly/blockly_compressed.js node_modules/blockly/blocks_compressed.js node_modules/blockly/javascript_compressed.js www/vendor/
cp node_modules/blockly/msg/zh-hans.js www/vendor/msg-zh.js
# 版本：优先环境变量 APP_VERSION，否则读 package.json（避免未设环境时写成 0.0.0）
if [ -z "$APP_VERSION" ]; then
  APP_VERSION=$(node -p "require('./package.json').version")
fi
echo "window.APP_VERSION='$APP_VERSION';" > www/version.js
