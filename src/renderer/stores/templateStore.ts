import { defineStore } from 'pinia';
import type { LogTemplate, SaveTemplatePayload } from '@shared/models/log-template';
import i18n from '../i18n';

interface RegexTestResult {
  line: string;
  matched: boolean;
  groups: Record<string, string>;
  error?: string;
}

interface TemplateFormState extends SaveTemplatePayload {
  sampleInput: string;
}

/**
 * 模板管理 Store：集中处理模板的增删改查、表单状态以及 Regex 测试结果。
 */
export const useTemplateStore = defineStore('templateStore', {
  state: () => ({
    templates: [] as LogTemplate[],
    recentItems: [] as Array<{
      filePath: string;
      templateId: string;
      templateName: string;
      openedAt: number;
    }>,
    loading: false,
    saving: false,
    errorMessage: '',
    mode: 'idle' as 'idle' | 'creating' | 'editing',
    currentForm: createEmptyForm(),
    testResults: [] as RegexTestResult[]
  }),
  actions: {
    /**
     * 拉取所有模板，确保界面刷新后数据同步。
     */
    async fetchAll(): Promise<void> {
      this.loading = true;
      try {
        this.templates = await window.logViewerApi.getTemplates();
      } catch (error) {
        this.errorMessage = formatError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchRecent(): Promise<void> {
      this.recentItems = await window.logViewerApi.getRecentItems();
    },

    async saveRecent(filePath: string, templateId: string, templateName: string): Promise<void> {
      this.recentItems = await window.logViewerApi.saveRecentItem({
        filePath,
        templateId,
        templateName
      });
    },

    /**
     * 切换到“新增模板”模式并重置表单。
     */
    startCreate(): void {
      this.mode = 'creating';
      this.errorMessage = '';
      this.currentForm = createEmptyForm();
      this.testResults = [];
    },

    /**
     * 切换到编辑模式并填充当前表单。
     */
    startEdit(template: LogTemplate): void {
      this.mode = 'editing';
      this.errorMessage = '';
      this.currentForm = {
        id: template.id,
        name: template.name,
        regex: template.regex,
        timestampField: template.timestampField,
        ftsField: template.ftsField,
        sampleInput: this.currentForm.sampleInput
      };
      this.testResults = [];
    },

    /**
     * 重置表单且恢复到 idle 状态。
     */
    resetForm(): void {
      this.mode = 'idle';
      this.errorMessage = '';
      this.currentForm = createEmptyForm();
      this.testResults = [];
    },

    /**
     * 调用主进程 IPC 保存模板，成功后刷新本地列表。
     */
    async saveCurrent(): Promise<void> {
      this.saving = true;
      this.errorMessage = '';
      try {
        const payload: SaveTemplatePayload = {
          id: this.currentForm.id,
          name: this.currentForm.name.trim(),
          regex: this.currentForm.regex.trim(),
          timestampField: this.currentForm.timestampField.trim(),
          ftsField: this.currentForm.ftsField.trim()
        };
        const saved = await window.logViewerApi.saveTemplate(payload);
        const existingIndex = this.templates.findIndex((item) => item.id === saved.id);
        if (existingIndex >= 0) {
          this.templates.splice(existingIndex, 1, saved);
        } else {
          this.templates.push(saved);
        }
        this.resetForm();
      } catch (error) {
        this.errorMessage = formatError(error);
        throw error;
      } finally {
        this.saving = false;
      }
    },

    /**
     * 删除指定模板并更新列表。
     */
    async deleteTemplate(templateId: string): Promise<void> {
      try {
        await window.logViewerApi.deleteTemplate(templateId);
        this.templates = this.templates.filter((item) => item.id !== templateId);
        if (this.currentForm.id === templateId) {
          this.resetForm();
        }
      } catch (error) {
        this.errorMessage = formatError(error);
        throw error;
      }
    },

    /**
     * 执行 Regex 测试，用于预览命名捕获组的匹配情况。
     */
    runRegexTest(): void {
      this.errorMessage = '';
      try {
        if (!this.currentForm.regex.trim()) {
          this.errorMessage = translate('templateStore.errors.regexRequired');
          this.testResults = [];
          return;
        }
        const regex = new RegExp(this.currentForm.regex, 'gm');
        const samples = this.currentForm.sampleInput
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        const results: RegexTestResult[] = samples.map((line) => {
          regex.lastIndex = 0;
          const match = regex.exec(line);
          if (!match || !match.groups) {
            return { line, matched: false, groups: {} };
          }
          return {
            line,
            matched: true,
            groups: match.groups
          };
        });

        this.testResults = results;
      } catch (error) {
        this.errorMessage = translate('templateStore.errors.regexTestFailed', {
          message: formatError(error)
        });
      }
    }
  }
});

const translate = (key: string, values?: Record<string, unknown>): string => {
  return i18n.global.t(key as never, values as never);
};

function createEmptyForm(): TemplateFormState {
  return {
    id: undefined,
    name: '',
    regex: '',
    timestampField: '',
    ftsField: '',
    sampleInput: ''
  };
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
