# LogViewer Pro

> A cross-platform desktop application for parsing and analyzing large-scale log files with dynamic template support.

[中文文档](./README_zh.md)

## Features

- 🚀 **High Performance** - Handle GB-scale log files with SQLite FTS5 indexing
- 🎯 **Dynamic Templates** - Define custom log formats using named capture groups
- 🔍 **Full-Text Search** - Fast search with automatic filter generation
- 💾 **Smart Caching** - Instant reload for previously indexed files
- 🌍 **i18n Support** - Built-in Chinese and English interface
- 🎨 **Modern UI** - Built with Vue 3 and virtual scrolling
- 📦 **Cross-Platform** - Windows, macOS, and Linux support

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/figozhu/LogViewerPro.git
cd LogViewerPro

# Install dependencies
npm install

# Start development
npm run dev
```

### Build

```bash
# Build for production
npm run dist
```

## Usage

### 1. Create a Template

Navigate to **Template Manager** and create a new template with:
- Template name
- Regular expression with named capture groups
- Timestamp field (for sorting)
- Full-text search field

Example regex:
```regex
\[(?<timestamp>.*?)\] \[(?<level>.*?)\] - (?<message>.*)
```

### 2. Open Log File

- Click **Quick Open** or use `Ctrl/Cmd + O`
- Select a template for parsing
- Wait for indexing (first time only)

### 3. Search & Filter

- Use the search box for full-text search
- Apply filters from the sidebar
- Click any row to view details

## Tech Stack

- **Framework**: Electron 39 + Vue 3
- **Language**: TypeScript
- **Database**: better-sqlite3 with FTS5
- **State Management**: Pinia
- **Build Tool**: electron-vite
- **Testing**: Vitest

## Development

```bash
# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

## Project Structure

```
LogViewerPro/
├── src/
│   ├── main/          # Electron main process
│   ├── renderer/      # Vue 3 UI
│   ├── worker/        # Background indexing
│   └── shared/        # Shared types & models
├── tests/             # Unit tests
└── doc/               # Documentation
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](./LICENSE) for details

## Links

- [GitHub Repository](https://github.com/figozhu/LogViewerPro)
- [Issue Tracker](https://github.com/figozhu/LogViewerPro/issues)
