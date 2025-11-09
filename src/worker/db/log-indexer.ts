import { createReadStream, type ReadStream } from 'node:fs';
import * as readline from 'node:readline';
import { createRequire } from 'node:module';
import type { IndexWorkerCacheInfo, IndexWorkerTemplate } from '../../shared/models/indexing.js';
import type BetterSqlite3 from 'better-sqlite3';

const require = createRequire(import.meta.url);
const betterSqlite3Path = (globalThis as any).__BETTER_SQLITE3_PATH__ || 'better-sqlite3';
const Database = require(betterSqlite3Path) as typeof BetterSqlite3;

export interface IndexResult {
  inserted: number;
  skipped: number;
  unmatchedSamples: string[];
  cancelled: boolean;
}

export class LogIndexer {
  private cancelled = false;
  private readonly regex: RegExp;
  private readonly logStartRegex: RegExp;
  private stream?: ReadStream;
  private reader?: readline.Interface;

  constructor(
    private readonly filePath: string,
    private readonly template: IndexWorkerTemplate,
    private readonly cacheInfo: IndexWorkerCacheInfo,
    private readonly columns: string[]
  ) {
    this.regex = new RegExp(this.template.regex);
    // 检测日志起始行：以 [ 开头后跟日期时间格式
    this.logStartRegex = /^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/;
  }

  public cancel(): void {
    this.cancelled = true;
    this.reader?.close();
    this.stream?.destroy();
  }

  public async run(reportProgress: (progress: number) => void): Promise<IndexResult> {
    const db = new (Database as any)(this.cacheInfo.dbPath) as BetterSqlite3.Database;
    try {
      const insertStmt = this.prepareInsert(db);
      const insertMany = db.transaction((rows: Record<string, unknown>[]) => {
        rows.forEach((row) => insertStmt.run(row));
      });

      const stream = createReadStream(this.filePath, { encoding: 'utf-8' });
      this.stream = stream;
      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
      });
      this.reader = rl;

      const buffer: Record<string, unknown>[] = [];
      const batchSize = 500;
      let inserted = 0;
      const unmatchedSamples: string[] = [];
      let skipped = 0;
      let lastProgress = 0;
      let currentLogBuffer = ''; // 多行日志缓冲区

      const flush = () => {
        if (!buffer.length) {
          return;
        }
        insertMany(buffer.splice(0, buffer.length));
      };

      const processLogEntry = (logEntry: string) => {
        const row = this.parseLine(logEntry);
        if (row) {
          buffer.push(row);
          if (buffer.length >= batchSize) {
            const batchCount = buffer.length;
            flush();
            inserted += batchCount;
          }
        } else {
          skipped += 1;
          if (unmatchedSamples.length < 5) {
            unmatchedSamples.push(logEntry.substring(0, 200));
          }
        }
      };

      try {
        for await (const line of rl) {
          if (this.cancelled) {
            break;
          }

          // 判断是否为新日志的开始
          if (this.logStartRegex.test(line)) {
            // 处理之前缓冲的完整日志
            if (currentLogBuffer) {
              processLogEntry(currentLogBuffer);
            }
            // 开始新的日志条目
            currentLogBuffer = line;
          } else if (currentLogBuffer) {
            // 追加到当前日志
            currentLogBuffer += '\n' + line;
          } else {
            // 文件开头的非日志行，跳过
            skipped += 1;
          }

          const bytesRead = stream.bytesRead ?? 0;
          const percent =
            this.cacheInfo.sourceSize > 0
              ? Math.min(99, Math.floor((bytesRead / this.cacheInfo.sourceSize) * 100))
              : 50;
          if (percent - lastProgress >= 5) {
            lastProgress = percent;
            reportProgress(percent);
          }
        }
        // 处理最后一条日志
        if (currentLogBuffer) {
          processLogEntry(currentLogBuffer);
        }
      } finally {
        rl.close();
        stream.close();
        this.reader = undefined;
        this.stream = undefined;
      }

      if (buffer.length > 0) {
        const batchCount = buffer.length;
        flush();
        inserted += batchCount;
      }

      if (!this.cancelled) {
        reportProgress(100);
      }

      return {
        inserted,
        skipped,
        unmatchedSamples,
        cancelled: this.cancelled
      };
    } finally {
      db.close();
      this.reader = undefined;
      this.stream = undefined;
    }
  }

  private prepareInsert(db: BetterSqlite3.Database) {
    const columnSql = this.columns.map((name) => `"${name}"`).join(', ');
    const paramSql = this.columns.map((name) => `@${name}`).join(', ');
    return db.prepare(`INSERT INTO logs (${columnSql}) VALUES (${paramSql});`);
  }

  private parseLine(line: string): Record<string, unknown> | null {
    this.regex.lastIndex = 0;
    const match = this.regex.exec(line);
    if (!match || !match.groups) {
      return null;
    }

    const row: Record<string, unknown> = {};
    for (const column of this.columns) {
      const value = match.groups[column];
      if (column === this.template.timestampField) {
        row[column] = this.normalizeTimestamp(value);
      } else {
        row[column] = value ?? null;
      }
    }
    return row;
  }

  private normalizeTimestamp(value?: string): number | null {
    if (!value) {
      return null;
    }
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    return null;
  }
}
