import electron from './electron-shim';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const electronApi = electron ?? ({} as typeof import('electron'));
const { app } = electronApi;

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

let logFilePath: string | null = null;
let logDirPath: string | null = null;

/**
 * 鍒濆鍖栨棩蹇楀瓨鍌ㄨ矾寰勶紝榛樿鍐欏叆鐢ㄦ埛鏁版嵁鐩綍涓嬬殑 logs/app.log銆? */
export function initLogger(): void {
  if (!app) {
    console.warn('[Logger] Electron APIs unavailable; skip log initialization.');
    return;
  }
  const baseDir = app.getPath('userData');
  const logDir = join(baseDir, 'logs');
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  logDirPath = logDir;
  logFilePath = join(logDir, 'app.log');
  writeLog('INFO', 'Logger initialized');
}

/**
 * 缁熶竴鐨勬棩蹇楀啓鍏ュ叆鍙ｃ€? */
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
      // 濡傛灉鏂囦欢鍐欏叆澶辫触锛岃嚦灏戠‘淇濇帶鍒跺彴鍙
      console.error('Unable to write log file. Please check disk permissions.', line);
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

export function getLogFilePath(): string | null {
  return logFilePath;
}

export function getLogDirPath(): string | null {
  return logDirPath;
}

export function readRecentLogs(limit = 200): Array<{
  timestamp: string;
  level: LogLevel;
  message: string;
  raw: string;
}> {
  if (!logFilePath || !existsSync(logFilePath)) return [];
  const content = readFileSync(logFilePath, 'utf-8');
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  const tail = lines.slice(-limit);
  return tail
    .map((line) => parseLogLine(line))
    .filter(
      (entry): entry is { timestamp: string; level: LogLevel; message: string; raw: string } =>
        entry !== null
    );
}

const logLinePattern = /^\[(.+?)\]\s+\[(INFO|WARN|ERROR)\]\s+(.*)$/;

function parseLogLine(
  line: string
): { timestamp: string; level: LogLevel; message: string; raw: string } | null {
  const match = line.match(logLinePattern);
  if (!match) return null;
  return {
    timestamp: match[1],
    level: match[2] as LogLevel,
    message: match[3],
    raw: line
  };
}



