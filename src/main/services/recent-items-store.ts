import Store from 'electron-store';

interface RecentItem {
  filePath: string;
  templateId: string;
  templateName: string;
  openedAt: number;
}

interface RecentItemsSchema {
  items: RecentItem[];
}

const MAX_ITEMS = 10;

/**
 * 管理最近打开的文件列表，用于模板选择流程中的快速访问。
 */
export class RecentItemsStore {
  private store: Store<RecentItemsSchema>;

  constructor() {
    this.store = new Store<RecentItemsSchema>({
      name: 'recent-items',
      defaults: {
        items: []
      }
    });
  }

  public save(filePath: string, templateId: string, templateName = ''): void {
    const items = this.getAll();
    const existingIndex = items.findIndex((item) => item.filePath === filePath);
    const newItem: RecentItem = {
      filePath,
      templateId,
      templateName,
      openedAt: Date.now()
    };

    if (existingIndex >= 0) {
      items.splice(existingIndex, 1);
    }
    items.unshift(newItem);
    this.store.set(
      'items',
      items.slice(0, MAX_ITEMS).map((item) => ({
        ...item,
        templateName: item.templateName ?? ''
      }))
    );
  }

  public getAll(): RecentItem[] {
    return this.store.get('items', []);
  }
}
