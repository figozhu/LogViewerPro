/**
 * 日志模板的核心描述结构，用于在主进程与渲染进程之间传输。
 */
export interface LogTemplate {
  id: string;
  name: string;
  regex: string;
  timestampField: string;
  ftsField: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 保存模板时的载荷，未提供 id 时视为创建操作。
 */
export type SaveTemplatePayload = Omit<LogTemplate, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};
