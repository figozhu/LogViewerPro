import type { LogTemplate } from '@shared/models/log-template';

export interface TemplateSelectionResult {
  templateId: string;
  templateName: string;
}

/**
 * 弹出模板选择对话框（简化实现：返回第一个模板或提示创建）。
 * 后续可替换为自定义 modal，目前仅作为流程占位。
 */
export async function promptTemplateSelection(
  templates: LogTemplate[]
): Promise<TemplateSelectionResult | null> {
  if (templates.length === 0) {
    alert('当前没有可用模板，请先创建模板。');
    return null;
  }

  // 简化为原生 prompt，后续可替换为自定义 UI
  const templateNames = templates.map((tpl, idx) => `${idx + 1}. ${tpl.name}`).join('\n');
  const input = prompt(`请选择模板（输入序号）：\n${templateNames}`, '1');
  if (!input) {
    return null;
  }
  const index = Number(input) - 1;
  if (Number.isNaN(index) || index < 0 || index >= templates.length) {
    alert('无效的模板序号');
    return null;
  }
  const template = templates[index];
  return {
    templateId: template.id,
    templateName: template.name
  };
}
