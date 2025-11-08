import { app } from 'electron';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

let logFilePath: string | null = null;

/**
 * 初始化日志存储路径，默认写入用户数据目录下的 logs/app.log。
 */
export function initLogger(): void {
  const baseDir = app.getPath('userData');
  const logDir = join(baseDir, 'logs');
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  logFilePath = join(logDir, 'app.log');
  writeLog('INFO', 'Logger initialized');
}

/**
 * 统一的日志写入入口。
 */
function writeLog(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  const metaString =
    meta && typeof meta !== 'undefined'
      ? ` ${JSON.stringify(meta, (_, value) => (value instanceof Error ? value.stack : value))}`
      : '';
  const line = `[${timestamp}] [${level}] ${message}${metaString}\n`;
  if (logFilePath) {
    try {
      appendFileSync(logFilePath, line, { encoding: 'utf-8' });
    } catch {
      // 如果文件写入失败，至少确保控制台可见
      console.error('无法写入日志文件，请检查磁盘权限。', line);
    }
  }
  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  info(message: string, meta?: unknown): void {
    writeLog('INFO', message, meta);
  },
  warn(message: string, meta?: unknown): void {
    writeLog('WARN', message, meta);
  },
  error(message: string, meta?: unknown): void {
    writeLog('ERROR', message, meta);
  }
};
