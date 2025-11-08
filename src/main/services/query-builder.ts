export interface BuildOptions {
  table: string;
  ftsField?: string;
  search?: string;
  filters?: Record<string, string>;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export class QueryBuilder {
  constructor(private readonly options: BuildOptions) {}

  public build(): { sql: string; params: unknown[] } {
    const { table } = this.options;
    const whereParts: string[] = [];
    const params: unknown[] = [];

    if (this.options.search && this.options.ftsField) {
      whereParts.push(
        `rowid IN (SELECT rowid FROM ${table}_fts WHERE ${this.options.ftsField} MATCH ?)`
      );
      params.push(this.options.search);
    }

    if (this.options.filters) {
      for (const [key, value] of Object.entries(this.options.filters)) {
        whereParts.push(`${table}."${key}" = ?`);
        params.push(value);
      }
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const orderSql = this.options.orderBy
      ? `ORDER BY ${table}."${this.options.orderBy}" ${this.options.orderDir ?? 'DESC'}`
      : `ORDER BY ${table}."${this.options.ftsField ?? 'id'}" DESC`;
    const limitSql = `LIMIT ${this.options.limit ?? 100}`;
    const offsetSql = `OFFSET ${this.options.offset ?? 0}`;

    const sql = `SELECT * FROM ${table} ${whereSql} ${orderSql} ${limitSql} ${offsetSql}`;
    return { sql, params };
  }

  public buildCount(): { sql: string; params: unknown[] } {
    const { table } = this.options;
    const whereParts: string[] = [];
    const params: unknown[] = [];

    if (this.options.search && this.options.ftsField) {
      whereParts.push(
        `rowid IN (SELECT rowid FROM ${table}_fts WHERE ${this.options.ftsField} MATCH ?)`
      );
      params.push(this.options.search);
    }

    if (this.options.filters) {
      for (const [key, value] of Object.entries(this.options.filters)) {
        whereParts.push(`${table}."${key}" = ?`);
        params.push(value);
      }
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    return { sql: `SELECT COUNT(*) as total FROM ${table} ${whereSql}`, params };
  }
}
