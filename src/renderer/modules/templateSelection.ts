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
  if (templates.length === 1) {
    return {
      templateId: templates[0]!.id,
      templateName: templates[0]!.name
    };
  }

  return new Promise<TemplateSelectionResult | null>((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(5, 6, 11, 0.78);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2048;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      width: min(420px, 90vw);
      max-height: 80vh;
      background: #111827;
      border-radius: 16px;
      padding: 24px;
      color: #f5f5f5;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
      display: flex;
      flex-direction: column;
      gap: 16px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    `;

    const title = document.createElement('h3');
    title.textContent = '选择解析模板';
    title.style.margin = '0';

    const hint = document.createElement('p');
    hint.textContent = '请选择一个模板用于解析本次打开的日志文件：';
    hint.style.margin = '0';
    hint.style.color = 'rgba(255,255,255,0.75)';

    const list = document.createElement('div');
    list.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      max-height: 45vh;
    `;

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex; justify-content:flex-end; gap:12px;';

    const cleanup = () => {
      document.removeEventListener('keydown', handleKey);
      overlay.remove();
    };

    const handleSelect = (template: LogTemplate | null) => {
      cleanup();
      if (!template) {
        resolve(null);
        return;
      }
      resolve({
        templateId: template.id,
        templateName: template.name
      });
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleSelect(null);
      }
    };

    templates.forEach((tpl) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = tpl.name;
      button.style.cssText = `
        text-align: left;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.04);
        color: inherit;
        padding: 12px 14px;
        border-radius: 10px;
        cursor: pointer;
        transition: background 0.2s, border 0.2s;
        width: 100%;
      `;
      button.onmouseenter = () => {
        button.style.background = 'rgba(63, 140, 255, 0.15)';
        button.style.borderColor = 'rgba(63, 140, 255, 0.6)';
      };
      button.onmouseleave = () => {
        button.style.background = 'rgba(255, 255, 255, 0.04)';
        button.style.borderColor = 'rgba(255, 255, 255, 0.12)';
      };
      button.onclick = () => handleSelect(tpl);

      const meta = document.createElement('div');
      meta.style.cssText = 'font-size: 12px; color: rgba(255,255,255,0.65); margin-top: 4px;';
      meta.textContent = `时间字段：${tpl.timestampField} · 全文字段：${tpl.ftsField}`;

      const wrapper = document.createElement('div');
      wrapper.appendChild(button);
      wrapper.appendChild(meta);
      list.appendChild(wrapper);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.type = 'button';
    cancelBtn.style.cssText = `
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: transparent;
      color: inherit;
      padding: 8px 18px;
      border-radius: 8px;
      cursor: pointer;
    `;
    cancelBtn.onclick = () => handleSelect(null);

    footer.appendChild(cancelBtn);
    dialog.appendChild(title);
    dialog.appendChild(hint);
    dialog.appendChild(list);
    dialog.appendChild(footer);

    overlay.appendChild(dialog);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        handleSelect(null);
      }
    });

    document.body.appendChild(overlay);
    document.addEventListener('keydown', handleKey);
  });
}
