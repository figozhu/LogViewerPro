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
    throw new Error('Template name is required.');
  }
  if (!payload.regex?.trim()) {
    throw new Error('Regular expression is required.');
  }
  if (!payload.timestampField?.trim()) {
    throw new Error('Timestamp field is required.');
  }
  if (!payload.ftsField?.trim()) {
    throw new Error('Full-text field is required.');
  }

  try {
    // 验证正则本身可被 JS 引擎解析
    void new RegExp(payload.regex);
  } catch (error) {
    throw new Error(`Regular expression is invalid: ${(error as Error).message}`);
  }

  const namedGroups = extractNamedGroups(payload.regex);
  if (namedGroups.length === 0) {
    throw new Error(
      'The regular expression must contain at least one named capture group, e.g., (?<level>INFO).'
    );
  }

  if (!namedGroups.includes(payload.timestampField)) {
    throw new Error(
      `Timestamp field "${payload.timestampField}" does not exist in the named capture groups.`
    );
  }

  if (!namedGroups.includes(payload.ftsField)) {
    throw new Error(
      `Full-text field "${payload.ftsField}" does not exist in the named capture groups.`
    );
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
