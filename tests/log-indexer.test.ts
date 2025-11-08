import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { LogIndexer } from '../src/worker/db/log-indexer';
import type { IndexWorkerTemplate, IndexWorkerCacheInfo } from '../src/shared/models/indexing';

const template: IndexWorkerTemplate = {
  id: 'tpl-1',
  name: 'API',
  regex: '\\[(?<timestamp>[^\\]]+)]\\s+(?<level>INFO|ERROR)\\s+-\\s+(?<message>.*)',
  timestampField: 'timestamp',
  ftsField: 'message'
};

const columns = ['timestamp', 'level', 'message'];

const createEnvironment = (content: string) => {
  const dir = mkdtempSync(join(tmpdir(), 'log-indexer-'));
  const logFile = join(dir, 'sample.log');
  writeFileSync(logFile, content, 'utf-8');

  const dbPath = join(dir, 'cache.db');
  const metaPath = join(dir, 'cache.json');
  writeFileSync(metaPath, '{}', 'utf-8');

  const db = new Database(dbPath);
  db.exec(
    'CREATE TABLE logs ("timestamp" INTEGER, "level" TEXT, "message" TEXT); DELETE FROM logs;'
  );
  db.close();

  const cacheInfo: IndexWorkerCacheInfo = {
    cacheKey: 'test',
    dbPath,
    metaPath,
    sourceMtime: Date.now(),
    sourceSize: statSync(logFile).size
  };

  return { dir, logFile, dbPath, cacheInfo };
};

const cleanupDir = (dir: string) => {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe.skip('LogIndexer', () => {
  const dirs: string[] = [];
  afterEach(() => {
    while (dirs.length) {
      const dir = dirs.pop();
      if (dir) cleanupDir(dir);
    }
  });

  it('ingests matching lines and captures unmatched samples', async () => {
    const content = [
      '[2024-01-01T00:00:00Z] INFO - Service started',
      'INVALID LINE',
      '[1704067200000] ERROR - Crash'
    ].join('\n');
    const { dir, logFile, dbPath, cacheInfo } = createEnvironment(content);
    dirs.push(dir);
    const indexer = new LogIndexer(logFile, template, cacheInfo, columns);
    const progressSpy = vi.fn();
    const result = await indexer.run(progressSpy);

    expect(result.cancelled).toBe(false);
    expect(result.inserted).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.unmatchedSamples).toHaveLength(1);

    const db = new Database(dbPath, { readonly: true });
    const rows = db.prepare('SELECT * FROM logs ORDER BY timestamp').all();
    db.close();

    expect(rows).toHaveLength(2);
    expect(rows[0]?.timestamp).toBe(Date.parse('2024-01-01T00:00:00Z'));
    expect(rows[0]?.level).toBe('INFO');
    expect(rows[1]?.timestamp).toBe(1704067200000);
    expect(rows[1]?.level).toBe('ERROR');
    expect(progressSpy).toHaveBeenCalled();
  });
});
