// 仅在 Windows 平台设置 exe 图标
import { platform } from 'os';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (platform() === 'win32') {
  const exePath = join(__dirname, '../release/win-unpacked/LogViewer Pro.exe');
  
  if (existsSync(exePath)) {
    const rceditPath = join(__dirname, '../node_modules/rcedit/bin/rcedit.exe');
    const iconPath = join(__dirname, '../buildResources/icon.ico');
    
    console.log('Setting icon for Windows executable...');
    execSync(`"${rceditPath}" "${exePath}" --set-icon "${iconPath}"`, { stdio: 'inherit' });
    console.log('Icon set successfully!');
  } else {
    console.log('Windows executable not found, skipping icon setting.');
  }
} else {
  console.log(`Skipping icon setting on ${platform()} platform.`);
}
