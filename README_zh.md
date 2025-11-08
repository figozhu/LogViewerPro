# LogViewer Pro

> 跨平台日志可视化工具，支持动态模板解析大型日志文件

[English](./README.md)

## 特性

- 🚀 **高性能** - 基于 SQLite FTS5 索引，轻松处理 GB 级日志文件
- 🎯 **动态模板** - 使用命名捕获组自定义日志格式
- 🔍 **全文搜索** - 快速搜索，自动生成过滤器
- 💾 **智能缓存** - 已索引文件瞬时重新加载
- 🌍 **多语言** - 内置中英文界面
- 🎨 **现代化界面** - 基于 Vue 3 和虚拟滚动
- 📦 **跨平台** - 支持 Windows、macOS 和 Linux

## 快速开始

### 环境要求

- Node.js 20+
- npm 或 yarn

### 安装

```bash
# 克隆仓库
git clone https://github.com/figozhu/LogViewerPro.git
cd LogViewerPro

# 安装依赖
npm install

# 启动开发环境
npm run dev
```

### 构建

```bash
# 构建生产版本
npm run dist
```

## 使用说明

### 1. 创建模板

进入**模板管理**，创建新模板并配置：
- 模板名称
- 使用命名捕获组的正则表达式
- 时间字段（用于排序）
- 全文搜索字段

正则示例：
```regex
\[(?<timestamp>.*?)\] \[(?<level>.*?)\] - (?<message>.*)
```

### 2. 打开日志文件

- 点击**快速打开**或使用 `Ctrl/Cmd + O`
- 选择解析模板
- 等待索引完成（仅首次需要）

### 3. 搜索与过滤

- 使用搜索框进行全文搜索
- 从侧边栏应用过滤器
- 点击任意行查看详情

## 技术栈

- **框架**: Electron 39 + Vue 3
- **语言**: TypeScript
- **数据库**: better-sqlite3 with FTS5
- **状态管理**: Pinia
- **构建工具**: electron-vite
- **测试**: Vitest

## 开发

```bash
# 运行测试
npm test

# 代码检查
npm run lint

# 代码格式化
npm run format

# 类型检查
npm run typecheck
```

## 项目结构

```
LogViewerPro/
├── src/
│   ├── main/          # Electron 主进程
│   ├── renderer/      # Vue 3 界面
│   ├── worker/        # 后台索引
│   └── shared/        # 共享类型与模型
├── tests/             # 单元测试
└── doc/               # 文档
```

## 贡献

欢迎贡献代码！请随时提交 Pull Request。

## 许可证

MIT License - 详见 [LICENSE](./LICENSE)

## 链接

- [GitHub 仓库](https://github.com/figozhu/LogViewerPro)
- [问题反馈](https://github.com/figozhu/LogViewerPro/issues)
