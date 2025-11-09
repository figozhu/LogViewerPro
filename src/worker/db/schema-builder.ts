import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { IndexWorkerCacheInfo, IndexWorkerTemplate } from '../../shared/models/indexing.js';
import type BetterSqlite3 from 'better-sqlite3';

const require = createRequire(import.meta.url);
const betterSqlite3Path = (globalThis as any).__BETTER_SQLITE3_PATH__ || 'better-sqlite3';
const Database = require(betterSqlite3Path) as typeof BetterSqlite3;

const NAMED_GROUP_REGEX = /\(\?<([A-Za-z0-9_]+)>/g;

/**
 * 根据模板构建 SQLite Schema，包含 logs/meta 表。
 */
export class SchemaBuilder {
  constructor(
    private readonly template: IndexWorkerTemplate,
    private readonly cacheInfo: IndexWorkerCacheInfo
  ) {}

  public build(): string[] {
    mkdirSync(dirname(this.cacheInfo.dbPath), { recursive: true });
    const db = new (Database as any)(this.cacheInfo.dbPath) as BetterSqlite3.Database;
    try {
      const columns = this.extractColumns();
      this.createLogsTable(db, columns);
      this.createFtsTable(db);
      this.createMetaTable(db);
      this.writeMeta(db);
      return columns;
    } finally {
      db.close();
    }
  }

  private extractColumns(): string[] {
    const matches = new Set<string>();
    let match: RegExpExecArray | null;
    const regex = new RegExp(NAMED_GROUP_REGEX);
    while ((match = regex.exec(this.template.regex)) !== null) {
      matches.add(match[1]);
    }
    if (!matches.size) {
      throw new Error('Template regex must contain at least one named capture group.');
    }
    if (!matches.has(this.template.timestampField)) {
      throw new Error(
        `Timestamp field "${this.template.timestampField}" is not defined in the named capture groups.`
      );
    }
    if (!matches.has(this.template.ftsField)) {
      throw new Error(
        `Full-text field "${this.template.ftsField}" is not defined in the named capture groups.`
      );
    }
    return Array.from(matches);
  }

  private createLogsTable(db: BetterSqlite3.Database, columns: string[]): void {
    const columnSql = columns
      .map((name) => {
        const columnType = name === this.template.timestampField ? 'INTEGER' : 'TEXT';
        return `"${name}" ${columnType}`;
      })
      .join(', ');
    db.exec('DROP TABLE IF EXISTS logs;');
    db.exec(`CREATE TABLE logs (id INTEGER PRIMARY KEY AUTOINCREMENT, ${columnSql});`);
  }

  private createFtsTable(db: BetterSqlite3.Database): void {
    const ftsField = this.template.ftsField;
    db.exec('DROP TABLE IF EXISTS logs_fts;');
    db.exec(
      `CREATE VIRTUAL TABLE logs_fts USING fts5("${ftsField}", content='logs', content_rowid='id');`
    );

    db.exec('DROP TRIGGER IF EXISTS logs_ai;');
    db.exec(
      `CREATE TRIGGER logs_ai AFTER INSERT ON logs BEGIN INSERT INTO logs_fts(rowid, "${ftsField}") VALUES (new.id, new."${ftsField}"); END;`
    );

    db.exec('DROP TRIGGER IF EXISTS logs_ad;');
    db.exec(
      'CREATE TRIGGER logs_ad AFTER DELETE ON logs BEGIN DELETE FROM logs_fts WHERE rowid = old.id; END;'
    );

    db.exec('DROP TRIGGER IF EXISTS logs_au;');
    db.exec(
      `CREATE TRIGGER logs_au AFTER UPDATE ON logs BEGIN UPDATE logs_fts SET "${ftsField}" = new."${ftsField}" WHERE rowid = new.id; END;`
    );
  }

  private createMetaTable(db: BetterSqlite3.Database): void {
    db.exec('DROP TABLE IF EXISTS meta;');
    db.exec('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);');
  }

  private writeMeta(db: BetterSqlite3.Database): void {
    const stmt = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
    const metaEntries: Array<[string, string]> = [
      ['template_id', this.template.id],
      ['template_name', this.template.name],
      ['template_regex', this.template.regex],
      ['timestamp_field', this.template.timestampField],
      ['fts_field', this.template.ftsField],
      ['source_mtime', String(this.cacheInfo.sourceMtime)]
    ];
    const transaction = db.transaction(() => {
      metaEntries.forEach(([key, value]) => stmt.run(key, value));
    });
    transaction();
  }
}
