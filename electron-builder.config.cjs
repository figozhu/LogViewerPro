/* eslint-env node */

/**
 * Electron Builder 配置：用于跨平台打包 LogViewer Pro。
 * - Windows: 生成 NSIS 安装包与 ZIP
 * - macOS: 生成 dmg/zip（未签名，需要开发者自行签名）
 * - Linux: 生成 AppImage/zip
 */
module.exports = {
  appId: 'com.figo.logviewerpro',
  productName: 'LogViewer Pro',
  asar: true,
  directories: {
    output: 'release',
    buildResources: 'buildResources'
  },
  files: [
    'dist/main/**/*',
    'dist/preload/**/*',
    'dist/renderer/**/*',
    'buildResources/**/*',
    'package.json',
    'node_modules/**/*'
  ],
  extraResources: [
    {
      from: 'dist/worker',
      to: 'worker',
      filter: ['**/*']
    }
  ],
  asarUnpack: [
    'node_modules/better-sqlite3/**/*'
  ],
  extraMetadata: {
    main: 'dist/main/index.js'
  },
  mac: {
    icon: 'buildResources/icon.icns',
    category: 'public.app-category.developer-tools',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      'zip'
    ],
    artifactName: '${productName}-${version}-mac-${arch}.${ext}'
  },
  dmg: {
    backgroundColor: '#1e1e1e',
    iconSize: 128
  },
  win: {
    icon: 'buildResources/icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      'zip'
    ],
    artifactName: '${productName}-${version}-win-${arch}.${ext}',
    signAndEditExecutable: false
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    perMachine: false
  },
  linux: {
    icon: 'buildResources/icon.png',
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      'zip'
    ],
    category: 'Utility',
    artifactName: '${productName}-${version}-linux-${arch}.${ext}'
  }
};
