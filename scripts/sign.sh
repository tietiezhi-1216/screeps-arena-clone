#!/bin/bash
# 用法：./scripts/sign.sh out.apk
# 密钥信息从环境变量读取（KEYSTORE / KEYSTORE_PASS / KEY_ALIAS），或从被 git 忽略的 keystore.properties 读取。仓库里不存放任何密码。
set -e
[ -f keystore.properties ] && { while IFS='=' read -r k v; do case "$k" in storeFile) : "${KEYSTORE:=$v}";; storePassword) : "${KEYSTORE_PASS:=$v}";; keyAlias) : "${KEY_ALIAS:=$v}";; esac; done < keystore.properties; }
KEYSTORE="${KEYSTORE/#\~/$HOME}"; : "${KEYSTORE:?}" "${KEYSTORE_PASS:?}"; KEY_ALIAS="${KEY_ALIAS:-release}"; export KEYSTORE_PASS
ANDROID_HOME="${ANDROID_HOME:-$HOME/sdk/android}"; J=$(ls -d "$HOME"/sdk/jdk-17* 2>/dev/null | head -1); [ -n "$J" ] && export PATH="$J/bin:$PATH"
BT=$(ls -d $ANDROID_HOME/build-tools/* | sort -V | tail -1)
$BT/zipalign -f 4 android/app/build/outputs/apk/release/app-release-unsigned.apk /tmp/sa-aligned.apk
$BT/apksigner sign --ks "$KEYSTORE" --ks-type PKCS12 --ks-key-alias "$KEY_ALIAS" --ks-pass env:KEYSTORE_PASS --out "$1" /tmp/sa-aligned.apk
$BT/apksigner verify --print-certs "$1" | head -3
