export interface BuildOptions {
  table: string;
  allowedColumns: string[];
  defaultOrderBy?: string;
  ftsField?: string;
  search?: string;
  filters?: Record<string, string>;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

/**
 * 负责在 Main 进程内构建查询 SQL，统一做列名白名单校验与参数规�? */
export class QueryBuilder {
  private readonly columnSet: Set<string>;

  constructor(private readonly options: BuildOptions) {
    this.columnSet = new Set(options.allowedColumns ?? []);
  }

  /**
   * 构建查询 SQL，返回 SQL 文本与参数列表，确保 limit/offset/列名全部被消毒�? */
  public build(): { sql: string; params: unknown[] } {
    const { table } = this.options;
    const { whereSql, params } = this.buildWhereClause();
    const orderSql = this.buildOrderSql();
    const limitSql = `LIMIT ${this.sanitizeLimit(this.options.limit)}`;
    const offsetSql = `OFFSET ${this.sanitizeOffset(this.options.offset)}`;
    const sql = `SELECT * FROM ${table} ${whereSql} ${orderSql} ${limitSql} ${offsetSql}`;
    return { sql, params };
  }

  /**
   * 构建 COUNT(*) 查询，用于获取总记录�? */
  public buildCount(): { sql: string; params: unknown[] } {
    const { table } = this.options;
    const { whereSql, params } = this.buildWhereClause();
    return { sql: `SELECT COUNT(*) as total FROM ${table} ${whereSql}`, params };
  }

  /**
   * 生成 WHERE 子句与绑定参数，统一处理全文检索和动态过滤逻辑。
   */
  private buildWhereClause(): { whereSql: string; params: unknown[] } {
    const { table } = this.options;
    const whereParts: string[] = [];
    const params: unknown[] = [];

    const ftsField = this.tryWrapColumnName(this.options.ftsField);
    if (this.options.search && ftsField) {
      whereParts.push(`rowid IN (SELECT rowid FROM ${table}_fts WHERE ${ftsField} MATCH ?)`);
      params.push(this.options.search);
    }

    if (this.options.filters) {
      for (const [key, value] of Object.entries(this.options.filters)) {
        const column = this.wrapColumnNameStrict(key, '过滤条件');
        whereParts.push(`${table}.${column} = ?`);
        params.push(value);
      }
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    return { whereSql, params };
  }

  /**
   * 生成 ORDER BY 子句，同时限制排序字段与排序方向。
   */
  private buildOrderSql(): string {
    const { table } = this.options;
    const column = this.wrapColumnNameStrict(
      this.options.orderBy ?? this.options.defaultOrderBy ?? 'id',
      '排序字段'
    );
    const requestedDir = (this.options.orderDir ?? 'DESC').toUpperCase();
    const dir = requestedDir === 'ASC' ? 'ASC' : 'DESC';
    return `ORDER BY ${table}.${column} ${dir}`;
  }

  /**
   * 规整 limit，防止注入或过大值影响性能。
   */
  private sanitizeLimit(value?: number): number {
    const resolved = Number.isFinite(value) ? Math.trunc(value as number) : 100;
    const clamped = Math.max(1, Math.min(resolved || 100, 1000));
    return clamped;
  }

  /**
   * 规整 offset，确保为非负整数。
   */
  private sanitizeOffset(value?: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.trunc(value as number));
  }

  /**
   * 对列名做严格校验与转义，用于 ORDER BY/过滤等位置。
   */
  private wrapColumnNameStrict(column?: string, context = '字段'): string {
    const wrapped = this.tryWrapColumnName(column);
    if (!wrapped) {
      throw new Error(`字段 ${column ?? '(未指定)'} 不存在或不可用于${context}`);
    }
    return wrapped;
  }

  /**
   * 尝试包装列名（可选），在列名缺失或不合法时返回 null。
   */
  private tryWrapColumnName(column?: string): string | null {
    if (!column || !this.columnSet.has(column)) {
      return null;
    }
    const sanitized = column.replace(/"/g, '""');
    return `"${sanitized}"`;
  }
}
