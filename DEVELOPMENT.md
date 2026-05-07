# Arch Linux 打包指南

本文档记录在 Arch Linux 上为 YAYA 日历应用构建 Android 安装包的完整流程。

## 环境要求

- Arch Linux x86_64
- 磁盘空间：约 10-15 GB
- 内存：建议 8GB+

## 一键安装依赖

```bash
# 安装 JDK 17
sudo pacman -S --noconfirm jdk17-openjdk cmake ninja

# 安装 Android SDK 命令行工具（通过 AUR）
yay -S --noconfirm android-sdk-cmdline-tools-latest

# 配置环境变量（添加到 ~/.config/fish/config.fish）
# Java
set -gx JAVA_HOME /usr/lib/jvm/java-17-openjdk

# Android SDK
set -gx ANDROID_HOME /opt/android-sdk
set -gx ANDROID_SDK_ROOT $ANDROID_HOME
set -gx PATH $PATH $ANDROID_HOME/cmdline-tools/latest/bin
set -gx PATH $PATH $ANDROID_HOME/platform-tools
set -gx PATH $PATH $ANDROID_HOME/emulator

# 重新加载配置
source ~/.config/fish/config.fish

# 创建许可证文件（避免交互式确认）
sudo mkdir -p /opt/android-sdk/licenses
echo -e "\n24333f8a63b6825ea9c5514f83c2829b004d1fee" | sudo tee /opt/android-sdk/licenses/android-sdk-license
echo -e "\n84831b9409646a918e30573bab4c9c91346d8abd" | sudo tee -a /opt/android-sdk/licenses/android-sdk-license
echo -e "\nd975f751698a77b662f1254ddbeed3901e976f5a" | sudo tee -a /opt/android-sdk/licenses/android-sdk-license
sudo chown -R $USER:$USER /opt/android-sdk

# 安装 SDK 组件（Expo SDK 54 需要）
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006"

# 生成本地原生项目
npx expo prebuild
```

## 已安装组件版本

| 组件                      | 版本          | 说明             |
| ------------------------- | ------------- | ---------------- |
| JDK                       | 17.0.19       | OpenJDK          |
| Android SDK cmdline-tools | 20.0          | 命令行工具       |
| platform-tools            | 37.0.0        | adb、fastboot 等 |
| platforms;android-36      | 2             | Android 16 API   |
| build-tools               | 36.0.0        | 构建工具         |
| NDK                       | 27.1.12297006 | 原生开发工具包   |
| cmake                     | 4.3.2         | 构建系统         |
| ninja                     | 1.13.2        | 构建系统         |

## 构建命令

```bash
# 构建 APK（用于测试）
npm run build:android:apk

# 构建 AAB（用于上架 Play Store）
npm run build:android:aab

# 同时构建 APK 和 AAB
npm run build:android
```

输出文件位置：

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## 签名配置（发布必需）

### 创建密钥库

```bash
keytool -genkeypair -v -storetype PKCS12 \
    -keystore android/app/yaya-release.keystore \
    -alias yaya \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass $YAYA_KEYSTORE_PASSWORD \
    -keypass $YAYA_KEY_PASSWORD \
    -dname "CN=YAYA, OU=Development, O=Anonymous, L=Unknown, ST=Unknown, C=CN"
```

### 配置签名（环境变量方式）

1. 在 `~/.config/fish/config.fish` 添加：

```fish
set -gx YAYA_KEYSTORE_PASSWORD "你的密钥库密码"
set -gx YAYA_KEY_PASSWORD "你的密钥密码"
```

2. 在 `android/gradle.properties` 添加：

```properties
MYAPP_RELEASE_STORE_FILE=yaya-release.keystore
MYAPP_RELEASE_KEY_ALIAS=yaya
```

3. 在 `android/app/build.gradle` 的 `android` 块中添加：

```gradle
signingConfigs {
    release {
        if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
            storeFile file(MYAPP_RELEASE_STORE_FILE)
            storePassword System.env.YAYA_KEYSTORE_PASSWORD
            keyAlias MYAPP_RELEASE_KEY_ALIAS
            keyPassword System.env.YAYA_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

## 常见问题

### SDK location not found

```bash
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

### Gradle 内存不足

在 `android/gradle.properties` 添加：

```properties
org.gradle.jvmargs=-Xmx4g -XX:+HeapDumpOnOutOfMemoryError
org.gradle.daemon=true
org.gradle.parallel=true
```

### 清理构建缓存

```bash
# 清理 Gradle 缓存
rm -rf ~/.gradle/caches/

# 清理 Android 构建缓存
rm -rf android/app/build/
rm -rf android/.gradle/

# 重新生成原生项目
npx expo prebuild --clean
```

## 相关文件

- 环境变量配置：`~/.config/fish/config.fish`
- 构建脚本：`package.json` 中的 `build:android*`
- 签名排除：`.gitignore` 中的 `*.keystore` 和 `keystore.properties`
