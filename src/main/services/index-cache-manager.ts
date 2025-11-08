import { app } from 'electron';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  existsSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync
} from 'node:fs';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { LogTemplate } from '@shared/models/log-template';
import type { CacheSummary } from '@shared/models/cache';

export interface CacheInfo {
  cacheKey: string;
  dbPath: string;
  metaPath: string;
  filePath: string;
  fileMtime: number;
  fileSize: number;
  templateId: string;
  templateName: string;
  templateRegex: string;
}

interface CacheMeta {
  cacheKey: string;
  filePath: string;
  templateId: string;
  templateName: string;
  templateRegex: string;
  sourceMtime: number;
  sourceSize?: number;
  insertedRows?: number;
  skippedRows?: number;
}

/**
 * 负责管理索引缓存的命名、路径、有效性与元数据。
 */
export class IndexCacheManager {
  private cacheDir: string;

  constructor() {
    const baseDir = app.getPath('userData');
    this.cacheDir = join(baseDir, 'index_cache');
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 根据文件与模板生成缓存信息。
   */
  public async resolve(filePath: string, template: LogTemplate): Promise<CacheInfo> {
    const cacheKey = createHash('md5').update(`${filePath}::${template.regex}`).digest('hex');
    const dbPath = join(this.cacheDir, `${cacheKey}.db`);
    const metaPath = join(this.cacheDir, `${cacheKey}.json`);
    const stats = await fs.stat(filePath);

    return {
      cacheKey,
      dbPath,
      metaPath,
      filePath,
      fileMtime: stats.mtimeMs,
      fileSize: stats.size,
      templateId: template.id,
      templateName: template.name,
      templateRegex: template.regex
    };
  }

  /**
   * 检查缓存是否有效（db 文件存在且 mtime 未变化）。
   */
  public async isCacheValid(info: CacheInfo): Promise<boolean> {
    if (!existsSync(info.dbPath) || !existsSync(info.metaPath)) {
      return false;
    }
    const meta = this.readMeta(info.metaPath);
    return (
      meta.templateId === info.templateId &&
      meta.templateRegex === info.templateRegex &&
      meta.filePath === info.filePath &&
      meta.sourceMtime === info.fileMtime
    );
  }

  /**
   * 写入缓存元数据，用于后续命中判断。
   */
  public writeMeta(info: CacheInfo): void {
    const meta: CacheMeta = {
      cacheKey: info.cacheKey,
      filePath: info.filePath,
      templateId: info.templateId,
      templateName: info.templateName,
      templateRegex: info.templateRegex,
      sourceMtime: info.fileMtime,
      sourceSize: info.fileSize
    };
    writeFileSync(info.metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }

  public writeStats(info: CacheInfo, stats: { inserted?: number; skipped?: number }): void {
    const metaPath = info.metaPath;
    let meta = this.readMeta(metaPath);
    meta = {
      ...meta,
      insertedRows: stats.inserted ?? meta.insertedRows,
      skippedRows: stats.skipped ?? meta.skippedRows
    };
    writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }

  /**
   * 汇总缓存占用情况。
   */
  public getSummary(): CacheSummary {
    const entries: CacheSummary['entries'] = [];
    let totalSize = 0;
    const metaFiles = readdirSync(this.cacheDir).filter((name) => name.endsWith('.json'));
    for (const metaFile of metaFiles) {
      try {
        const metaPath = join(this.cacheDir, metaFile);
        const meta = this.readMeta(metaPath);
        const dbPath = join(this.cacheDir, `${meta.cacheKey}.db`);
        if (!existsSync(dbPath)) {
          continue;
        }
        const stats = statSync(dbPath);
        totalSize += stats.size;
        entries.push({
          cacheKey: meta.cacheKey,
          dbPath,
          metaPath,
          templateName: meta.templateName,
          filePath: meta.filePath,
          size: stats.size,
          updatedAt: meta.sourceMtime,
          insertedRows: meta.insertedRows,
          skippedRows: meta.skippedRows
        });
      } catch {
        continue;
      }
    }
    return { totalSize, cacheDir: this.cacheDir, entries };
  }

  public clearAll(): void {
    const files = readdirSync(this.cacheDir);
    for (const file of files) {
      rmSync(join(this.cacheDir, file), { force: true });
    }
  }

  public clearByKey(cacheKey: string): void {
    const targets = [`${cacheKey}.db`, `${cacheKey}.json`];
    for (const file of targets) {
      const full = join(this.cacheDir, file);
      if (existsSync(full)) {
        rmSync(full, { force: true });
      }
    }
  }

  private readMeta(metaPath: string): CacheMeta {
    const content = readFileSync(metaPath, 'utf-8');
    return JSON.parse(content) as CacheMeta;
  }

  public getCacheDir(): string {
    return this.cacheDir;
  }
}
