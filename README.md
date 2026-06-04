# AI 大师级调色工厂 · AI LUT Factory

上传照片，AI 自动分析画面风格并生成 9 款达芬奇兼容的 .cube 调色预设文件。支持下载套用 LUT 后的原画质调色照片。

Upload a photo and let AI analyze its style, then generate 9 DaVinci-compatible .cube LUT presets. Also download full-resolution graded images with the LUT applied.

## 功能 · Features

- 拖拽或点击上传照片 · Drag-and-drop or click to upload
- AI 分析画面影调、色彩和情绪 · AI analyzes tone, color, and mood
- 自动生成 9 款电影级调色风格（流式逐张展示） · Generates 9 cinematic LUTs with streaming display
- 下载 .cube 3D LUT 文件（达芬奇 / Premiere / Final Cut 可用） · Download .cube files for DaVinci, Premiere, Final Cut
- 下载套用 LUT 后的原画质调色照片 · Download full-res graded images

## 本地运行 · Getting Started

```bash
# 1. 安装依赖 · Install dependencies
npm install

# 2. 启动开发服务器 · Start dev server
npm run dev

# 3. 浏览器打开 · Open in browser
# http://localhost:5173
```

## 使用方式 · How to Use

1. 点击右上角「API 设置」，填写你的 API 信息 · Click "API Settings" and enter your API details
2. 支持任何兼容 OpenAI Chat Completions 格式的 API（OpenAI / DeepSeek / Moonshot / 本地模型等） · Compatible with any OpenAI Chat Completions API
3. 上传照片，等待 AI 分析后即可下载结果 · Upload a photo, wait for analysis, then download

不填 API Key 也能体验——点击上传后会自动载入内置的 9 款大师级预设。
Works without an API key — built-in 9 master presets will be loaded automatically.

## 技术栈 · Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- 纯 Canvas 像素级色彩渲染，无后端依赖 · Pure Canvas pixel-level rendering, no backend

## 开源协议 · License

MIT License
