import { describe, it, expect } from 'vitest';
import { QueryBuilder } from '../src/main/services/query-builder';

const baseOptions = {
  table: 'logs',
  allowedColumns: ['id', 'timestamp', 'level', 'message'],
  defaultOrderBy: 'timestamp',
  ftsField: 'message'
};

describe('QueryBuilder', () => {
  it('builds SQL with search and filters using parameter binding', () => {
    const builder = new QueryBuilder({
      ...baseOptions,
      search: 'timeout',
      filters: { level: 'ERROR' },
      limit: 50,
      offset: 10,
      orderDir: 'ASC'
    });

    const { sql, params } = builder.build();
    expect(sql).toContain('rowid IN (SELECT rowid FROM logs_fts WHERE "message" MATCH ?)');
    expect(sql).toContain('logs."level" = ?');
    expect(sql).toContain('ORDER BY logs."timestamp" ASC');
    expect(sql).toContain('LIMIT 50');
    expect(sql).toContain('OFFSET 10');
    expect(params).toEqual(['timeout', 'ERROR']);
  });

  it('defaults limit/offset and order when not provided', () => {
    const builder = new QueryBuilder({
      ...baseOptions
    });
    const { sql } = builder.build();
    expect(sql).toContain('ORDER BY logs."timestamp" ASC');
    expect(sql).toContain('LIMIT 100');
    expect(sql).toContain('OFFSET 0');
  });

  it('clamps invalid limit/offset values', () => {
    const builder = new QueryBuilder({
      ...baseOptions,
      limit: 5000,
      offset: -20
    });
    const { sql } = builder.build();
    expect(sql).toContain('LIMIT 1000');
    expect(sql).toContain('OFFSET 0');
  });

  it('throws when filters reference disallowed columns', () => {
    const builder = new QueryBuilder({
      ...baseOptions,
      filters: { nonexistent: 'x' } as Record<string, string>
    });
    expect(() => builder.build()).toThrow(/does not exist or cannot be used for/);
  });

  it('builds count queries with identical where clauses', () => {
    const builder = new QueryBuilder({
      ...baseOptions,
      search: 'error',
      filters: { level: 'WARN' }
    });
    const mainStmt = builder.build();
    const countStmt = builder.buildCount();
    expect(mainStmt.params).toEqual(countStmt.params);
    expect(countStmt.sql).toContain('SELECT COUNT(*) as total FROM logs WHERE');
  });
});
