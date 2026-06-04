import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, RefreshCw, Settings, Eye, EyeOff, Save, Check } from 'lucide-react';

// ==========================================
// 核心颜色数学运算 (用于预览渲染和LUT生成)
// ==========================================

const clamp = (val, min = 0, max = 1) => {
    if (isNaN(val)) return 0;
    return Math.min(Math.max(val, min), max);
};
const getLuminance = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const adjustContrast = (color, amount) => clamp((color - 0.5) * amount + 0.5);

// 安全的数字转换，防止出现NaN
const safeNum = (val, defaultVal) => {
    const num = Number(val);
    return isNaN(num) ? defaultVal : num;
};

// 核心调色算法：根据AI生成的参数处理单个像素
const applyColorGrade = (r, g, b, rawParams) => {
    const params = {
        contrast: safeNum(rawParams?.contrast, 1.0),
        saturation: safeNum(rawParams?.saturation, 1.0),
        shadow_lift: safeNum(rawParams?.shadow_lift, 0.0),
        highlight_compress: safeNum(rawParams?.highlight_compress, 0.0),
        temperature: safeNum(rawParams?.temperature, 0.0),
        tint: safeNum(rawParams?.tint, 0.0),
        r_shift: safeNum(rawParams?.r_shift, 0.0),
        g_shift: safeNum(rawParams?.g_shift, 0.0),
        b_shift: safeNum(rawParams?.b_shift, 0.0),
    };

    // 1. 曝光与对比度
    let l = getLuminance(r, g, b);
    let r1 = adjustContrast(r, params.contrast);
    let g1 = adjustContrast(g, params.contrast);
    let b1 = adjustContrast(b, params.contrast);

    // 2. 高光压缩与阴影提亮 (使用非线性曲线平滑过渡，保护高光和暗部)
    const applyTone = (c, lift, compress) => {
        let val = c + lift * Math.pow(1 - c, 2);
        val = val - compress * Math.pow(val, 2);
        return val;
    };
    r1 = applyTone(r1, params.shadow_lift, params.highlight_compress);
    g1 = applyTone(g1, params.shadow_lift, params.highlight_compress);
    b1 = applyTone(b1, params.shadow_lift, params.highlight_compress);

    // 3. 色温 (Temp) 与 色调 (Tint)
    r1 += params.temperature;
    b1 -= params.temperature;
    g1 -= params.tint;
    r1 += params.tint * 0.5;
    b1 += params.tint * 0.5;

    // 4. RGB 通道偏移 (打造胶片色调)
    r1 += params.r_shift;
    g1 += params.g_shift;
    b1 += params.b_shift;

    // 5. 饱和度
    let l2 = getLuminance(r1, g1, b1);
    r1 = l2 + (r1 - l2) * params.saturation;
    g1 = l2 + (g1 - l2) * params.saturation;
    b1 = l2 + (b1 - l2) * params.saturation;

    return [clamp(r1), clamp(g1), clamp(b1)];
};

// ==========================================
// 默认回退预设数据 (当API请求失败时使用)
// ==========================================
const fallbackData = {
    analysis: "已为您成功加载9款好莱坞大师级电影调色预设（若您已配置API key，这代表当前请求失败或使用了默认回退）。这9款风格经过极限参数控制，能保障绝对的高级感与可用性。",
    luts: [
        { name: "经典青橙 (Teal & Orange)", params: { contrast: 1.08, saturation: 1.1, shadow_lift: 0.02, highlight_compress: 0.02, temperature: 0.04, tint: -0.01, r_shift: 0.03, g_shift: 0.0, b_shift: -0.05 } },
        { name: "王家卫胶片 (Wong Kar-wai)", params: { contrast: 1.15, saturation: 0.85, shadow_lift: 0.05, highlight_compress: 0.08, temperature: -0.02, tint: 0.03, r_shift: 0.02, g_shift: -0.02, b_shift: 0.01 } },
        { name: "加州暖阳 (Golden Hour)", params: { contrast: 1.05, saturation: 1.15, shadow_lift: 0.03, highlight_compress: 0.0, temperature: 0.08, tint: 0.01, r_shift: 0.04, g_shift: 0.01, b_shift: -0.04 } },
        { name: "冷峻芬奇 (David Fincher)", params: { contrast: 1.18, saturation: 0.8, shadow_lift: 0.01, highlight_compress: 0.05, temperature: -0.05, tint: -0.02, r_shift: -0.02, g_shift: 0.04, b_shift: -0.01 } },
        { name: "复古褪色胶片 (Muted Film)", params: { contrast: 0.95, saturation: 0.75, shadow_lift: 0.08, highlight_compress: 0.04, temperature: 0.03, tint: 0.01, r_shift: 0.01, g_shift: 0.01, b_shift: 0.0 } },
        { name: "黑客帝国 (The Matrix)", params: { contrast: 1.15, saturation: 0.9, shadow_lift: 0.0, highlight_compress: 0.02, temperature: -0.04, tint: -0.06, r_shift: -0.03, g_shift: 0.05, b_shift: -0.02 } },
        { name: "极致徕卡单色 (Leica Mono)", params: { contrast: 1.25, saturation: 0.0, shadow_lift: 0.03, highlight_compress: 0.04, temperature: 0, tint: 0, r_shift: 0, g_shift: 0, b_shift: 0 } },
        { name: "莫哈韦废土 (Desert Wasteland)", params: { contrast: 1.1, saturation: 0.6, shadow_lift: 0.02, highlight_compress: 0.06, temperature: 0.05, tint: 0.03, r_shift: 0.03, g_shift: 0.0, b_shift: -0.03 } },
        { name: "东京小清新 (Tokyo Pastel)", params: { contrast: 0.92, saturation: 0.95, shadow_lift: 0.06, highlight_compress: 0.1, temperature: -0.03, tint: 0.0, r_shift: -0.01, g_shift: 0.02, b_shift: 0.04 } }
    ]
};

// 强力的 JSON 提取器，应对非标准模型输出
const extractJSON = (text) => {
    try {
        return JSON.parse(text);
    } catch (e) {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
            try {
                return JSON.parse(match[1]);
            } catch (e2) {}
        }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            try {
                return JSON.parse(text.slice(firstBrace, lastBrace + 1));
            } catch (e3) {}
        }
        throw new Error("无法解析AI返回的JSON数据，请检查模型输出格式。");
    }
};

export default function App() {
    const [originalImage, setOriginalImage] = useState(null);
    const [processingState, setProcessingState] = useState('idle'); // idle, analyzing, generating, done, error
    const [progress, setProgress] = useState(0);
    const [analysisResult, setAnalysisResult] = useState("");
    const [lutResults, setLutResults] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [isDragging, setIsDragging] = useState(false);

    // API 配置状态
    const [apiKey, setApiKey] = useState('');
    const [apiUrl, setApiUrl] = useState('https://api.openai.com/v1/chat/completions');
    const [apiModel, setApiModel] = useState('gpt-4o-mini');
    const [showKey, setShowKey] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);

    const fileInputRef = useRef(null);
    const originalFullResRef = useRef(null);

    // 从本地缓存加载 API 配置
    useEffect(() => {
        const savedKey = localStorage.getItem('lut_api_key');
        const savedUrl = localStorage.getItem('lut_api_url');
        const savedModel = localStorage.getItem('lut_api_model');

        if (savedKey) setApiKey(savedKey);
        if (savedUrl) setApiUrl(savedUrl);
        if (savedModel) setApiModel(savedModel);

        // 如果没有配置过API Key，默认展开配置面板提示用户
        if (!savedKey) {
            setShowSettings(true);
        }
    }, []);

    // 保存 API 设置
    const saveSettings = () => {
        localStorage.setItem('lut_api_key', apiKey);
        localStorage.setItem('lut_api_url', apiUrl);
        localStorage.setItem('lut_api_model', apiModel);
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
    };

    // 处理拖放与上传
    const processFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        setProcessingState('analyzing');
        setLutResults([]);
        setAnalysisResult("");
        setErrorMessage("");

        const reader = new FileReader();
        reader.onload = (event) => {
            originalFullResRef.current = event.target.result as string;
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 800;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                setOriginalImage(resizedDataUrl);

                // 开始AI分析流程
                analyzeImageAndGenerateLUTs(resizedDataUrl);
            };
            img.src = event.target.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleImageUpload = (e) => {
        processFile(e.target.files[0]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        processFile(file);
    };

    // 指数退避网络请求
    const fetchWithBackoff = async (url, headers, body) => {
        const delays = [1000, 2000, 4000];
        for (let i = 0; i < delays.length; i++) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(body)
                });
                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(`API Error: ${res.status} - ${errText}`);
                }
                return await res.json();
            } catch (err) {
                if (i === delays.length - 1) throw err;
                await new Promise(r => setTimeout(r, delays[i]));
            }
        }
    };

    // 核心AI调色生成流程
    const analyzeImageAndGenerateLUTs = async (base64Image) => {
        const base64Data = base64Image.split(',')[1];

        const systemPrompt = `你是一个专业的好莱坞影视电影调色师。
请分析用户上传的照片，提取它的影调、色彩和情绪。
根据分析结果，量身定制9个大师级别的电影调色预设（LUT）。
提供每个预设的参数，为了保证调色高级、自然、不失真，请严格遵循以下极小的电影级调整范围：
- contrast: 对比度 (0.92 到 1.12，极其轻微的S曲线)
- saturation: 饱和度 (0.75 到 1.10，去饱和通常更具电影感)
- shadow_lift: 阴影提亮 (0.0 到 0.05，防止暗部死黑，提供空气感)
- highlight_compress: 高光柔和 (0.0 到 0.06，保护高光细节)
- temperature: 色温 (-0.04 到 0.04，微调即可改变氛围)
- tint: 色调 (-0.03 到 0.03)
- r_shift, g_shift, b_shift: RGB通道微偏 (-0.03 到 0.03，用于打造经典青橙色调、高质感胶片感)

请发挥创造力，为每个风格起一个有电影感、诗意的中文名字（如"冷峻芬奇"、"王家卫胶片"、"东京物语"、"摩洛哥暮色"）。务必确保色彩高级、克制且高度可用！`;

        const userPrompt = `请分析此图，并严格按照以下 JSON Schema 格式返回结果（不要返回任何其他解释性文字）：
{
  "analysis": "这里写你对该图片的影调、色彩倾向和情绪特征的简短专业分析（约100字）",
  "luts": [
    {
      "name": "风格名称",
      "params": {
        "contrast": 1.05,
        "saturation": 0.9,
        "shadow_lift": 0.02,
        "highlight_compress": 0.01,
        "temperature": -0.02,
        "tint": 0.01,
        "r_shift": 0.02,
        "g_shift": -0.01,
        "b_shift": 0.01
      }
    }
  ] // 必须正好生成 9 组调色
}`;

        let aiData;

        try {
            if (!apiKey) {
                throw new Error("请先在顶部展开配置面板，并填写您的 API Key。");
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };

            const payload = {
                model: apiModel,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: userPrompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Data}`
                                }
                            }
                        ]
                    }
                ],
                response_format: { type: "json_object" }
            };

            setStatusMessage("正在调用 AI 模型进行色彩分析喵...");
            const apiResult = await fetchWithBackoff(apiUrl, headers, payload);
            setStatusMessage("正在解析 AI 返回结果喵...");
            const textResponse = apiResult.choices?.[0]?.message?.content;
            if (!textResponse) throw new Error("API未返回有效内容");
            aiData = extractJSON(textResponse);

            // 验证并截取前 9 个
            if (!aiData.luts || aiData.luts.length < 1) throw new Error("未检测到生成的调色预设列表");
            if (aiData.luts.length < 9) {
                // 自动补齐至 9 个，以防 AI 罢工
                const currentLen = aiData.luts.length;
                for (let i = currentLen; i < 9; i++) {
                    aiData.luts.push(fallbackData.luts[i % 9]);
                }
            } else {
                aiData.luts = aiData.luts.slice(0, 9);
            }

        } catch (error) {
            console.error("AI Analysis failed, using fallback.", error);
            aiData = fallbackData;
            setErrorMessage(`AI 分析失败 (${error.message})。已自动载入大厂级预设模型。`);
        }

        setAnalysisResult(aiData.analysis);
        setProcessingState('generating');

        // 渲染流程
        const imgObj = new Image();
        imgObj.onload = async () => {
            setLutResults([]);
            for (let i = 0; i < aiData.luts.length; i++) {
                const lutDef = aiData.luts[i];
                const cubeText = generateCubeFileText(lutDef.params, lutDef.name);
                const previewUrl = await renderPreviewCanvas(imgObj, lutDef.params);

                setLutResults(prev => [...prev, {
                    id: i,
                    name: lutDef.name,
                    params: lutDef.params,
                    cubeText: cubeText,
                    previewUrl: previewUrl
                }]);
                setProgress(Math.round(((i + 1) / 9) * 100));
            }
            setProcessingState('done');
        };
        imgObj.src = base64Image;
    };

    // 生成标准的 17x17x17 .cube 文件字符串
    const generateCubeFileText = (params, name) => {
        const size = 17;
        let text = `TITLE "${name}_AI_Generated"\n`;
        text += `LUT_3D_SIZE ${size}\n`;

        for (let b = 0; b < size; b++) {
            for (let g = 0; g < size; g++) {
                for (let r = 0; r < size; r++) {
                    const rNorm = r / (size - 1);
                    const gNorm = g / (size - 1);
                    const bNorm = b / (size - 1);

                    const [nr, ng, nb] = applyColorGrade(rNorm, gNorm, bNorm, params);
                    text += `${nr.toFixed(6)} ${ng.toFixed(6)} ${nb.toFixed(6)}\n`;
                }
            }
        }
        return text;
    };

    // 使用Canvas应用调色参数生成预览图
    const renderPreviewCanvas = async (imgObj, params) => {
        const PREVIEW_MAX = 400;
        let w = imgObj.width;
        let h = imgObj.height;
        if (w > PREVIEW_MAX) {
            h = Math.round((h * PREVIEW_MAX) / w);
            w = PREVIEW_MAX;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgObj, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;

            const [nr, ng, nb] = applyColorGrade(r, g, b, params);

            data[i] = nr * 255;
            data[i+1] = ng * 255;
            data[i+2] = nb * 255;
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.85);
    };

    // 下载 .cube 文件
    const handleDownload = (cubeText, name) => {
        const blob = new Blob([cubeText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = name.replace(/[^a-z0-9一-龥]/gi, '_');
        a.download = `${safeName}_Master.cube`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 下载 LUT 套用后的原画质图片
    const handleDownloadLUTImage = (params, name, e) => {
        e.stopPropagation();
        const fullResUrl = originalFullResRef.current;
        if (!fullResUrl) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i] / 255;
                const g = data[i + 1] / 255;
                const b = data[i + 2] / 255;
                const [nr, ng, nb] = applyColorGrade(r, g, b, params);
                data[i] = nr * 255;
                data[i + 1] = ng * 255;
                data[i + 2] = nb * 255;
            }
            ctx.putImageData(imageData, 0, 0);

            const mimeMatch = fullResUrl.match(/^data:(image\/\w+);/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
            const isJPEG = mimeType === 'image/jpeg';
            const ext = isJPEG ? 'jpg' : 'png';

            const safeName = name.replace(/[^a-z0-9一-龥]/gi, '_');
            const a = document.createElement('a');
            a.href = canvas.toDataURL(mimeType, isJPEG ? 0.95 : undefined);
            a.download = `${safeName}_Graded.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        img.src = fullResUrl;
    };

    const resetApp = () => {
        setOriginalImage(null);
        originalFullResRef.current = null;
        setProcessingState('idle');
        setLutResults([]);
        setProgress(0);
        setAnalysisResult("");
        setErrorMessage("");
        setStatusMessage("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans p-6 md:p-12 selection:bg-teal-500 selection:text-white">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* 头部 */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center">
                                <ImageIcon size={18} className="text-white" />
                            </div>
                            AI 大师级调色工厂
                        </h1>
                        <p className="text-zinc-500 mt-2">上传照片，AI 自动分析风格并生成 9 款达芬奇兼容的 .cube 调色预设。</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-all ${
                                showSettings ? 'bg-teal-900/30 text-teal-400 border border-teal-800/50' : 'bg-zinc-900 hover:bg-zinc-850 border border-zinc-800'
                            }`}
                        >
                            <Settings size={16} /> API 设置
                        </button>
                        {processingState !== 'idle' && (
                            <button
                                onClick={resetApp}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm rounded-md transition-colors"
                            >
                                <RefreshCw size={16} /> 重新上传
                            </button>
                        )}
                    </div>
                </header>

                {/* API 配置面板 */}
                {showSettings && (
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 space-y-4 animate-in slide-in-from-top-4 duration-300 backdrop-blur-md">
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                            <h3 className="text-md font-semibold text-zinc-200">AI 视觉接口配置</h3>
                            <span className="text-xs text-zinc-500">支持保存至本地浏览器，不暴露在公网</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-zinc-400 mb-1">API Key</label>
                                <div className="relative">
                                    <input
                                        type={showKey ? "text" : "password"}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded pl-3 pr-10 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                                    >
                                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">模型 (Model ID)</label>
                                <input
                                    type="text"
                                    value={apiModel}
                                    onChange={(e) => setApiModel(e.target.value)}
                                    placeholder="e.g. gpt-4o-mini"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">API 端点 (Base URL / Endpoint)</label>
                            <input
                                type="text"
                                value={apiUrl}
                                onChange={(e) => setApiUrl(e.target.value)}
                                placeholder="https://api.openai.com/v1/chat/completions"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={saveSettings}
                                className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm rounded transition-all"
                            >
                                {settingsSaved ? <Check size={16} /> : <Save size={16} />}
                                {settingsSaved ? "已保存到浏览器" : "保存配置"}
                            </button>
                        </div>
                    </div>
                )}

                {/* 错误提示 */}
                {errorMessage && (
                    <div className="bg-amber-950/40 border border-amber-800/50 text-amber-200 px-4 py-3 rounded-lg flex items-start gap-3">
                        <AlertCircle className="mt-0.5 shrink-0" size={18} />
                        <p className="text-sm">{errorMessage}</p>
                    </div>
                )}

                {/* 上传区域 */}
                {processingState === 'idle' && (
                    <div
                        className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[400px] ${
                            isDragging ? 'border-teal-500 bg-teal-900/20' : 'border-zinc-800 hover:bg-zinc-900/50 hover:border-zinc-700'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl ${
                            isDragging ? 'bg-teal-900/50 text-teal-400' : 'bg-zinc-900 text-zinc-400 group-hover:text-teal-400'
                        }`}>
                            <Upload size={32} />
                        </div>
                        <h3 className="text-xl font-medium text-zinc-200 mb-2">
                            {isDragging ? '松开鼠标即可上传' : '点击或拖拽上传照片'}
                        </h3>
                        <p className="text-zinc-500 text-sm">支持 JPG, PNG 格式。我们将提取画面情绪和影调进行 AI 分析。</p>

                        {!apiKey && (
                            <p className="text-xs text-amber-500 mt-4 bg-amber-950/20 px-3 py-1.5 rounded-full border border-amber-900/30">
                                💡 请先配置上方 API Key 获得定制服务（不配置将调用默认回退渲染）
                            </p>
                        )}

                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                        />
                    </div>
                )}

                {/* 加载与处理状态 */}
                {(processingState === 'analyzing' || processingState === 'generating') && (
                    <div className="flex flex-col items-center justify-center min-h-[400px] bg-zinc-900/30 rounded-2xl border border-zinc-800">
                        <Loader2 size={48} className="text-teal-500 animate-spin mb-6" />
                        <h3 className="text-xl font-medium text-zinc-200 mb-2">
                            {processingState === 'analyzing' ? 'AI 正在深度解析画面特征喵...' : '正在生成级联 3D LUT 模型喵...'}
                        </h3>
                        <p className="text-zinc-500 text-sm w-80 text-center mb-2">
                            {processingState === 'analyzing' && statusMessage && statusMessage}
                            {processingState === 'generating' && `正在应用电影级平滑调色算法喵 (${progress}%)`}
                        </p>
                        {processingState === 'analyzing' && (
                            <div className="w-64 h-2 bg-zinc-800 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-teal-400 animate-pulse rounded-full" style={{ width: '100%' }} />
                            </div>
                        )}
                        {processingState === 'generating' && (
                            <div className="w-64 h-2 bg-zinc-800 rounded-full mt-6 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-teal-400 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* 结果展示区域 */}
                {processingState === 'done' && (
                    <div className="space-y-8 animate-in fade-in duration-700">

                        {/* AI 分析报告 */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start">
                            <img
                                src={originalImage}
                                alt="Original"
                                className="w-32 h-32 object-cover rounded-lg border border-zinc-700 shadow-lg"
                            />
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle2 size={20} className="text-teal-400" />
                                    <h3 className="text-lg font-medium text-zinc-100">AI 专业色彩诊断报告</h3>
                                </div>
                                <p className="text-zinc-400 leading-relaxed text-sm md:text-base">
                                    {analysisResult}
                                </p>
                            </div>
                        </div>

                        {/* LUT 网格 */}
                        <div>
                            <div className="flex justify-between items-end mb-6">
                                <h3 className="text-xl font-semibold text-zinc-100">生成结果 (9 款大师级风格)</h3>
                                <p className="text-xs text-zinc-500">悬停卡片查看详情，底部按钮下载 LUT 文件或调色原图</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {lutResults.map((lut) => (
                                    <div
                                        key={lut.id}
                                        className="group rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all shadow-lg hover:shadow-2xl hover:shadow-black/50 animate-in fade-in slide-in-from-bottom-2 duration-500"
                                    >
                                        <div className="aspect-[4/3] w-full bg-zinc-800 overflow-hidden relative">
                                            <img
                                                src={lut.previewUrl}
                                                alt={lut.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 animate-in fade-in"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] pointer-events-none">
                                                <span className="text-white font-medium tracking-wider text-sm">预览效果</span>
                                            </div>
                                        </div>

                                        <div className="p-3 border-t border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-zinc-950">
                                            <span className="block font-medium text-zinc-200 text-sm mb-2 truncate">{lut.name}</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDownload(lut.cubeText, lut.name)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-zinc-800 hover:bg-teal-900/50 hover:text-teal-300 text-zinc-300 rounded-md transition-all border border-zinc-700 hover:border-teal-700/50"
                                                >
                                                    <Download size={14} /> .cube 预设
                                                </button>
                                                <button
                                                    onClick={(e) => handleDownloadLUTImage(lut.params, lut.name, e)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-zinc-800 hover:bg-blue-900/50 hover:text-blue-300 text-zinc-300 rounded-md transition-all border border-zinc-700 hover:border-blue-700/50"
                                                >
                                                    <ImageIcon size={14} /> 调色原图
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
