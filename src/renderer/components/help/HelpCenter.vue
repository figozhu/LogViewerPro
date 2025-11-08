<script setup lang="ts">
/**
 * 快速上手步骤的数据结构，方便未来扩展或本地化
 */
const quickSteps: Array<{ title: string; description: string }> = [
  {
    title: '1. 选择或创建模板',
    description: '在“模板管理”中配置命名捕获组，确保时间字段与全文字段已指定。'
  },
  {
    title: '2. 打开日志文件',
    description: '可以通过文件菜单、拖拽或主界面的“快速打开”按钮触发文件选择。'
  },
  {
    title: '3. 等待解析完成',
    description: '首次解析会建立索引，进度与缓存信息可在“运行状态”标签中查看。'
  },
  {
    title: '4. 搜索与筛选',
    description: '利用全文搜索与自动生成的筛选器快速定位关键信息。'
  }
];

/**
 * 常见快捷键与操作提示
 */
const shortcuts: Array<{ key: string; usage: string }> = [
  { key: 'Ctrl/Cmd + O', usage: '打开日志文件' },
  { key: 'Ctrl/Cmd + F', usage: '聚焦全文搜索输入框' },
  { key: 'Ctrl/Cmd + L', usage: '快速切换到日志标签（可自定义）' },
  { key: 'Ctrl/Cmd + ,', usage: '打开用户偏好设置（自定义查询条数等）' }
];

/**
 * 常见问题与提示合集
 */
const faqList: Array<{ question: string; answer: string }> = [
  {
    question: '索引耗时较长怎么办？',
    answer:
      '确保模板正则尽量精准以减少未匹配行，同时可以在“运行状态”中查看缓存占用，必要时清理后重试。'
  },
  {
    question: '字段内容是 JSON 时难以阅读？',
    answer: '行详情面板会自动尝试 Pretty Print，如果仍为原始格式，可复制后在外部工具中查看。'
  },
  {
    question: '怎样恢复默认主题或查询条数？',
    answer: '前往“偏好设置”标签即可调整主题、默认查询行数与窗口记忆等选项。'
  }
];

/**
 * 支持信息与反馈渠道
 */
const supportTips: Array<{ title: string; detail: string }> = [
  {
    title: 'GitHub Issues',
    detail: 'https://github.com/figozhu/LogViewerPro/issues'
  },
  {
    title: '提交日志反馈',
    detail: '在系统日志标签中导出最近的错误记录，附带说明即可快速定位问题。'
  },
  {
    title: '产品路线',
    detail: '欢迎在项目主页的 Discussions 中提出新需求与改进建议。'
  }
];
</script>

<template>
  <section class="help-center">
    <header class="help-header">
      <div>
        <h2>使用帮助</h2>
        <p>了解如何高效地解析大型日志文件，并掌握常用快捷操作。</p>
      </div>
      <a
        class="primary-link"
        href="https://github.com/figozhu/LogViewerPro"
        target="_blank"
        rel="noreferrer"
      >
        查看项目主页
      </a>
    </header>

    <section class="help-section">
      <h3>快速上手</h3>
      <ul class="step-list">
        <li v-for="item in quickSteps" :key="item.title">
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </li>
      </ul>
    </section>

    <section class="help-section">
      <h3>常用快捷键</h3>
      <table class="shortcut-table">
        <tbody>
          <tr v-for="item in shortcuts" :key="item.key">
            <td class="shortcut-key">{{ item.key }}</td>
            <td>{{ item.usage }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="help-section">
      <h3>常见问题</h3>
      <div class="faq-list">
        <article v-for="item in faqList" :key="item.question">
          <h4>{{ item.question }}</h4>
          <p>{{ item.answer }}</p>
        </article>
      </div>
    </section>

    <section class="help-section">
      <h3>反馈与支持</h3>
      <ul class="support-list">
        <li v-for="tip in supportTips" :key="tip.title">
          <strong>{{ tip.title }}</strong>
          <span>{{ tip.detail }}</span>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.help-center {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
  color: #f6f6fb;
  line-height: 1.6;
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.primary-link {
  padding: 10px 16px;
  border-radius: 10px;
  background-color: rgba(63, 140, 255, 0.2);
  border: 1px solid rgba(63, 140, 255, 0.6);
  color: #9ec5ff;
  text-decoration: none;
  font-weight: 600;
}

.help-section + .help-section {
  margin-top: 24px;
}

.step-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.step-list li {
  padding: 16px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.shortcut-table {
  width: 100%;
  border-collapse: collapse;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  overflow: hidden;
}

.shortcut-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.shortcut-table tr:last-child td {
  border-bottom: none;
}

.shortcut-key {
  width: 200px;
  font-weight: 600;
  color: #c3d5ff;
}

.faq-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.faq-list article {
  padding: 16px;
  border-radius: 12px;
  background-color: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.faq-list h4 {
  margin: 0 0 8px;
  font-size: 16px;
}

.support-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.support-list li {
  padding: 12px 16px;
  border-radius: 10px;
  background-color: rgba(63, 140, 255, 0.08);
  border: 1px solid rgba(63, 140, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.support-list span {
  color: rgba(255, 255, 255, 0.75);
  word-break: break-all;
}

@media (max-width: 900px) {
  .help-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .shortcut-key {
    width: 120px;
  }
}
</style>
