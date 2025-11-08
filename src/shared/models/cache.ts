export interface CacheEntrySummary {
  cacheKey: string;
  dbPath: string;
  metaPath: string;
  templateName: string;
  filePath: string;
  size: number;
  updatedAt: number;
  insertedRows?: number;
  skippedRows?: number;
}

export interface CacheSummary {
  totalSize: number;
  cacheDir: string;
  entries: CacheEntrySummary[];
}
