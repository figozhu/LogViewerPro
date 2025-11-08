export interface IndexStartRequest {
  filePath: string;
  templateId: string;
}

export interface IndexStartResponse {
  jobId: string;
  cacheUsed: boolean;
}

export interface IndexWorkerTemplate {
  id: string;
  name: string;
  regex: string;
  timestampField: string;
  ftsField: string;
}

export interface IndexWorkerCacheInfo {
  cacheKey: string;
  dbPath: string;
  metaPath: string;
  sourceMtime: number;
  sourceSize: number;
}

export interface IndexWorkerPayload {
  filePath: string;
  template: IndexWorkerTemplate;
  cacheInfo: IndexWorkerCacheInfo;
  jobId: string;
}

export interface IndexProgressEvent {
  jobId: string;
  progress: number;
  phase: 'preparing' | 'parsing' | 'cache';
}

export interface IndexCompleteEvent {
  jobId: string;
  cacheUsed: boolean;
  cancelled?: boolean;
  inserted?: number;
  skipped?: number;
  unmatched?: string[];
}
