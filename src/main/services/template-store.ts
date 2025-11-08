import Store, { type Options as StoreOptions } from 'electron-store';
import { randomUUID } from 'node:crypto';
import type { LogTemplate, SaveTemplatePayload } from '@shared/models/log-template';
import { validateTemplatePayload } from './template-validator';
import { logger } from '../logger';

interface TemplateStoreSchema {
  version: number;
  templates: LogTemplate[];
}

interface ImportOptions {
  overwrite?: boolean;
}

interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  errors: Array<{ name: string; reason: string }>;
}

const STORE_VERSION = 1;
const STORE_PROJECT_NAME = 'LogViewerPro';

/**
 * 模板存储服务：负责读写 electron-store，并提供基础校验。
 */
export class TemplateStore {
  private store: Store<TemplateStoreSchema>;

  constructor() {
    this.store = new Store<TemplateStoreSchema>({
      projectName: STORE_PROJECT_NAME,
      name: 'templates',
      defaults: {
        version: STORE_VERSION,
        templates: []
      }
    } as StoreOptions<TemplateStoreSchema>);
    this.migrateIfNeeded();
  }

  /**
   * 获取所有模板列表。
   */
  public getAll(): LogTemplate[] {
    return [...this.store.get('templates', [])];
  }

  /**
   * 根据 ID 获取模板。
   */
  public getById(templateId: string): LogTemplate | undefined {
    return this.getAll().find((item) => item.id === templateId);
  }

  /**
   * 保存或更新模板，如果没有提供 id 则自动生成。
   */
  public save(template: SaveTemplatePayload): LogTemplate {
    const templates = this.getAll();
    const timestamp = Date.now();
    const { namedGroups } = validateTemplatePayload(template);
    ensureNameUnique(templates, template);

    if (template.id) {
      const index = templates.findIndex((item) => item.id === template.id);
      if (index === -1) {
        throw new Error('Selected template does not exist. Please refresh and try again.');
      }

      const updatedTemplate: LogTemplate = {
        ...templates[index],
        ...template,
        updatedAt: timestamp
      };
      templates[index] = updatedTemplate;
      this.store.set('templates', templates);
      logger.info('Template updated', {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        namedGroups
      });
      return updatedTemplate;
    }

    const newTemplate: LogTemplate = {
      id: randomUUID(),
      name: template.name,
      regex: template.regex,
      timestampField: template.timestampField,
      ftsField: template.ftsField,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    templates.push(newTemplate);
    this.store.set('templates', templates);
    logger.info('Template created', { id: newTemplate.id, name: newTemplate.name, namedGroups });
    return newTemplate;
  }

  /**
   * 删除指定模板。
   */
  public delete(templateId: string): void {
    const templates = this.getAll();
    const filtered = templates.filter((item) => item.id !== templateId);
    this.store.set('templates', filtered);
    logger.warn('Template deleted', { id: templateId });
  }

  /**
   * 导出所有模板。
   */
  public exportTemplates(): LogTemplate[] {
    return this.getAll();
  }

  /**
   * 导入模板集合，可选择按名称覆盖。
   */
  public importTemplates(
    data: SaveTemplatePayload[],
    options: ImportOptions = {}
  ): ImportResult {
    const templates = this.getAll();
    const { overwrite = false } = options;
    const summary: ImportResult = { added: 0, updated: 0, skipped: 0, errors: [] };

    for (const payload of data) {
      try {
        const { namedGroups } = validateTemplatePayload(payload);
        const existingIndex = templates.findIndex((item) => item.name === payload.name);
        if (existingIndex >= 0) {
          if (!overwrite) {
            summary.skipped += 1;
            continue;
          }
          const updatedTemplate: LogTemplate = {
            ...templates[existingIndex],
            ...payload,
            updatedAt: Date.now()
          };
          templates[existingIndex] = updatedTemplate;
          summary.updated += 1;
          logger.info('Template import overwrite', { name: payload.name, namedGroups });
          continue;
        }

        const newTemplate: LogTemplate = {
          id: randomUUID(),
          name: payload.name,
          regex: payload.regex,
          timestampField: payload.timestampField,
          ftsField: payload.ftsField,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        templates.push(newTemplate);
        summary.added += 1;
        logger.info('Template import added', { name: payload.name, namedGroups });
      } catch (error) {
        summary.errors.push({
          name: payload.name,
          reason: (error as Error).message
        });
        summary.skipped += 1;
        logger.warn('Template import failed', {
          name: payload.name,
          reason: (error as Error).message
        });
      }
    }

    this.store.set('templates', templates);
    return summary;
  }

  private migrateIfNeeded(): void {
    const currentVersion = this.store.get('version', 0);
    if (currentVersion >= STORE_VERSION) {
      return;
    }

    const templates = this.store.get('templates', []).map((template) => ({
      ...template,
      createdAt: template.createdAt ?? Date.now(),
      updatedAt: template.updatedAt ?? Date.now()
    }));
    this.store.set('templates', templates);
    this.store.set('version', STORE_VERSION);
    logger.info('Template store migrated', { from: currentVersion, to: STORE_VERSION });
  }
}

const ensureNameUnique = (templates: LogTemplate[], payload: SaveTemplatePayload): void => {
  const normalizedName = payload.name.trim();
  const duplicated = templates.find(
    (item) => item.name === normalizedName && (!payload.id || item.id !== payload.id)
  );
  if (duplicated) {
    throw new Error(`A template named "${normalizedName}" already exists.`);
  }
};
