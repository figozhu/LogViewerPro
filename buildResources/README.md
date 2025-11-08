# buildResources

此目录用于存放应用图标、安装包背景图等资源。可根据不同平台提供：

- `icon.ico` / `icon.icns`：应用图标
- `background.png`：macOS dmg 背景

Electron Builder 会自动读取该目录下的资源并注入到最终安装包中。
