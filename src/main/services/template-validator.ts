import type { SaveTemplatePayload } from '@shared/models/log-template';

const NAMED_GROUP_REGEX = /\(\?<([a-zA-Z0-9_]+)>/g;

export interface TemplateValidationResult {
  namedGroups: string[];
}

/**
 * 校验模板定义是否合法（命名捕获组、关键字段、正则合法性等）。
 */
export function validateTemplatePayload(payload: SaveTemplatePayload): TemplateValidationResult {
  if (!payload.name?.trim()) {
    throw new Error('模板名称不能为空');
  }
  if (!payload.regex?.trim()) {
    throw new Error('正则表达式不能为空');
  }
  if (!payload.timestampField?.trim()) {
    throw new Error('必须指定时间字段');
  }
  if (!payload.ftsField?.trim()) {
    throw new Error('必须指定全文字段');
  }

  try {
    // 验证正则本身可被 JS 引擎解析
    void new RegExp(payload.regex);
  } catch (error) {
    throw new Error(`正则表达式无效: ${(error as Error).message}`);
  }

  const namedGroups = extractNamedGroups(payload.regex);
  if (namedGroups.length === 0) {
    throw new Error('正则表达式必须至少包含一个命名捕获组，如 (?<level>INFO)');
  }

  if (!namedGroups.includes(payload.timestampField)) {
    throw new Error(`时间字段 "${payload.timestampField}" 不存在于命名捕获组中`);
  }

  if (!namedGroups.includes(payload.ftsField)) {
    throw new Error(`全文字段 "${payload.ftsField}" 不存在于命名捕获组中`);
  }

  return { namedGroups };
}

const extractNamedGroups = (regex: string): string[] => {
  const groups = new Set<string>();
  let match: RegExpExecArray | null;
  const pattern = new RegExp(NAMED_GROUP_REGEX);
  while ((match = pattern.exec(regex)) !== null) {
    groups.add(match[1]);
  }
  return Array.from(groups);
};
