export interface QueryRequest {
  filePath: string;
  search?: string;
  filters?: Record<string, string>;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

export interface QueryResponse {
  rows: Record<string, unknown>[];
  total: number;
}

export interface SchemaInfo {
  columns: Array<{
    name: string;
    type: string;
    notnull: boolean;
  }>;
  meta: Record<string, string>;
}

export interface FilterOptionsRequest {
  filePath: string;
  columns: string[];
  limit?: number;
}

export type FilterOptionsResponse = Record<string, string[]>;
