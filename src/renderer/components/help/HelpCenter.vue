<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const quickSteps = [
  { titleKey: 'help.quickSteps.step1.title', descKey: 'help.quickSteps.step1.description' },
  { titleKey: 'help.quickSteps.step2.title', descKey: 'help.quickSteps.step2.description' },
  { titleKey: 'help.quickSteps.step3.title', descKey: 'help.quickSteps.step3.description' },
  { titleKey: 'help.quickSteps.step4.title', descKey: 'help.quickSteps.step4.description' }
];

const shortcuts = [
  { key: () => t('help.shortcuts.open.key'), usage: () => t('help.shortcuts.open.usage') },
  { key: () => t('help.shortcuts.search.key'), usage: () => t('help.shortcuts.search.usage') },
  { key: () => t('help.shortcuts.switchLogs.key'), usage: () => t('help.shortcuts.switchLogs.usage') },
  {
    key: () => t('help.shortcuts.preferences.key'),
    usage: () => t('help.shortcuts.preferences.usage')
  }
];

const faqList = [
  { questionKey: 'help.faq.slowIndex.question', answerKey: 'help.faq.slowIndex.answer' },
  { questionKey: 'help.faq.jsonField.question', answerKey: 'help.faq.jsonField.answer' },
  { questionKey: 'help.faq.resetPreference.question', answerKey: 'help.faq.resetPreference.answer' }
];

const supportTips = [
  { titleKey: 'help.support.issues.title', detailKey: 'help.support.issues.detail' },
  { titleKey: 'help.support.logs.title', detailKey: 'help.support.logs.detail' },
  { titleKey: 'help.support.roadmap.title', detailKey: 'help.support.roadmap.detail' }
];
</script>

<template>
  <section class="help-center">
    <header class="help-header">
      <div>
        <h2>{{ t('help.header.title') }}</h2>
        <p>{{ t('help.header.description') }}</p>
      </div>
      <a
        class="primary-link"
        href="https://github.com/figozhu/LogViewerPro"
        target="_blank"
        rel="noreferrer"
      >
        {{ t('help.header.homepage') }}
      </a>
    </header>

    <section class="help-section">
      <h3>{{ t('help.sections.quickStart') }}</h3>
      <ul class="step-list">
        <li v-for="item in quickSteps" :key="item.titleKey">
          <strong>{{ t(item.titleKey) }}</strong>
          <p>{{ t(item.descKey) }}</p>
        </li>
      </ul>
    </section>

    <section class="help-section">
      <h3>{{ t('help.sections.shortcuts') }}</h3>
      <table class="shortcut-table">
        <tbody>
          <tr v-for="item in shortcuts" :key="item.key()">
            <td class="shortcut-key">{{ item.key() }}</td>
            <td>{{ item.usage() }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="help-section">
      <h3>{{ t('help.sections.faq') }}</h3>
      <div class="faq-list">
        <article v-for="item in faqList" :key="item.questionKey">
          <h4>{{ t(item.questionKey) }}</h4>
          <p>{{ t(item.answerKey) }}</p>
        </article>
      </div>
    </section>

    <section class="help-section">
      <h3>{{ t('help.sections.support') }}</h3>
      <ul class="support-list">
        <li v-for="tip in supportTips" :key="tip.titleKey">
          <strong>{{ t(tip.titleKey) }}</strong>
          <span>{{ t(tip.detailKey) }}</span>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.help-center {
  background-color: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  padding: 24px;
  color: var(--text-color);
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
  background-color: color-mix(in srgb, var(--accent-color) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-color) 65%, transparent);
  color: var(--accent-color);
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
  background-color: var(--surface-color);
  border: 1px solid var(--panel-border);
}

.shortcut-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--surface-color);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--panel-border);
}

.shortcut-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--panel-border);
}

.shortcut-table tr:last-child td {
  border-bottom: none;
}

.shortcut-key {
  width: 200px;
  font-weight: 600;
  color: var(--accent-color);
}

.faq-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.faq-list article {
  padding: 16px;
  border-radius: 12px;
  background-color: var(--surface-color);
  border: 1px solid var(--panel-border);
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
  background-color: color-mix(in srgb, var(--accent-color) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-color) 35%, transparent);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.support-list span {
  color: var(--muted-text);
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
