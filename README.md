# AI 大师级调色工厂 · AI LUT Factory

上传照片，AI 自动分析画面风格并生成 9 款达芬奇兼容的 .cube 调色预设文件。支持下载套用 LUT 后的原画质调色照片。

Upload a photo and let AI analyze its style, then generate 9 DaVinci-compatible .cube LUT presets. Also download full-resolution graded images with the LUT applied.

---

## 白痴级本地运行教程 · Beginner's Guide

> 即使你完全不懂编程、不知道什么是"终端"、"npm"、"命令行"，跟着下面一步步做，5 分钟内就能跑起来。

### 第一步：安装 Node.js

这是电脑运行这个工具所需的"引擎"，只需要装一次。

1. 打开浏览器，访问 **https://nodejs.org**
2. 点左边那个绿色的 **LTS** 大按钮下载（不要点右边的）
3. 下载完成后双击打开，一路点 **Next**，全部默认选项不用改
4. 最后点 **Install**，等待安装完成

### 第二步：下载本项目

1. 在本页面顶部找到绿色的 **<> Code** 按钮，点击
2. 选择 **Download ZIP**
3. 下载完成后，右键 ZIP 文件 → **全部解压缩** → 选一个你找得到的文件夹（比如桌面）

### 第三步：打开终端

- **Windows 10/11**：按键盘 `Win + R`，输入 `cmd`，回车。弹出来的黑框框就是终端。
- **Mac**：按 `Cmd + 空格`，输入 `terminal`，回车。

### 第四步：进入项目文件夹

在终端里输入以下命令（**把 `你的解压路径` 替换成你实际解压到的位置**）：

```bash
cd 你的解压路径
```

> 举个例子：如果你解压到桌面，就是 `cd C:\Users\你的用户名\Desktop\ai-lut-factory-main`。
>
> 小技巧：在终端里输入 `cd `（cd 后面有个空格），然后把解压出来的文件夹直接**拖进终端窗口**，路径会自动填上。

### 第五步：安装依赖

在终端里输入（复制粘贴也行，回车运行）：

```bash
npm install
```

等待几十秒，看到一堆文字跑完、没有红色报错就 OK。

### 第六步：启动

在终端里输入：

```bash
npm run dev
```

看到 `Local: http://localhost:5173/` 就说明启动成功了。

### 第七步：打开使用

打开浏览器，地址栏输入 **http://localhost:5173**，回车。搞定。

之后每次要用只需要重复**第四步**和**第六步**（进文件夹 → `npm run dev`）。

---

## 使用方式 · How to Use

1. 点击右上角 **「API 设置」**，填写你的 API 信息
2. 支持任何兼容 OpenAI Chat Completions 格式的 API（OpenAI / DeepSeek / Moonshot / Kimi 等）
3. 上传照片，等待 AI 分析后即可下载结果

**不填 API Key 也能体验**——上传照片后会自动载入内置的 9 款大师级电影预设。

1. Click **"API Settings"** and enter your API details.
2. Works with any OpenAI Chat Completions compatible API (OpenAI / DeepSeek / Moonshot / Kimi, etc.).
3. Upload a photo, wait for AI analysis, then download the results.

Works even without an API key — 9 built-in cinematic presets will be loaded automatically.

---

## 功能 · Features

- 拖拽或点击上传照片 · Drag-and-drop or click to upload
- AI 分析画面影调、色彩和情绪 · AI analyzes tone, color, and mood
- 自动生成 9 款电影级调色风格（流式逐张展示） · Generates 9 cinematic LUTs with streaming display
- 下载 .cube 3D LUT 文件（达芬奇 / Premiere / Final Cut 可用） · Download .cube files for DaVinci, Premiere, Final Cut
- 下载套用 LUT 后的原画质调色照片 · Download full-res graded images

---

## 技术栈 · Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- 纯 Canvas 像素级色彩渲染，无后端依赖 · Pure Canvas pixel-level rendering, no backend

---

## 开源协议 · License

MIT License
