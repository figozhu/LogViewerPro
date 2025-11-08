import Store, { type Options as StoreOptions } from 'electron-store';

interface RecentItem {
  filePath: string;
  templateId: string;
  templateName: string;
  openedAt: number;
}

interface RecentItemsSchema {
  items: RecentItem[];
}

const STORE_PROJECT_NAME = 'LogViewerPro';
const MAX_ITEMS = 10;

/**
 * 绠＄悊鏈€杩戞墦寮€鐨勬枃浠跺垪琛紝鐢ㄤ簬妯℃澘閫夋嫨娴佺▼涓殑蹇€熻闂€? */
export class RecentItemsStore {
  private store: Store<RecentItemsSchema>;

  constructor() {
    this.store = new Store<RecentItemsSchema>({
      projectName: STORE_PROJECT_NAME,
      name: 'recent-items',
      defaults: {
        items: []
      }
    } as StoreOptions<RecentItemsSchema>);
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
