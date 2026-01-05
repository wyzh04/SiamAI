import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AnalysisData, TargetMarket } from "../types";

/**
 * Analyze product image for Specific Market (TH or PH) using Search Grounding
 */
export const analyzeProduct = async (
  base64Image: string,
  mimeType: string,
  additionalPrompt: string,
  market: TargetMarket
): Promise<AnalysisData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Dynamic Configuration based on Market
  const context = market === 'TH' 
    ? {
        role: "针对泰国市场 (Thailand) 的跨境电商专家",
        currency: "泰铢 (THB)",
        platforms: "Shopee TH, Lazada TH, TikTok Shop Thailand",
        culture: "佛教文化、皇室尊敬、颜色喜好（鲜艳）、气候（热带季风）",
        keywordsLang: "泰语 (Thai)",
        priceJsonExample: `{ "prices": [{ "name": "Shopee TH", "price": 450 }], "keywords": ["รองเท้า", "แฟชั่น"] }`
      }
    : {
        role: "针对菲律宾市场 (Philippines) 的跨境电商专家",
        currency: "菲律宾比索 (PHP)",
        platforms: "Shopee PH, Lazada PH, TikTok Shop Philippines",
        culture: "天主教文化、美式影响、英语普及、COD（货到付款）偏好",
        keywordsLang: "英语 (English) 或他加禄语 (Tagalog)",
        priceJsonExample: `{ "prices": [{ "name": "Shopee PH", "price": 450 }], "keywords": ["Rubber Shoes", "Murang Sapatos"] }`
      };

  try {
    const prompt = `
      你是一位${context.role}分析师。
      请分析这张产品图片。
      
      请提供一份综合性的中文报告，包含以下内容：
      1. 产品识别 (Product Identification)。
      2. ${market === 'TH' ? '泰国' : '菲律宾'}市场适应性 (Market Suitability) - 是否符合当地${context.culture}及消费习惯？
      3. 竞品分析 (Competitor Analysis) - 参考 ${context.platforms} 的趋势。
      4. 定价策略 (Pricing Strategy) - 预估${context.currency}价格区间。
      5. 营销角度 (Marketing Angles) - 本土化文案切入点。
      
      用户备注: ${additionalPrompt}
      
      【重要数据提取 1：价格】
      请根据分析，提供 Shopee, Lazada, TikTok Shop 三个平台的【预估平均售价】（单位：${market === 'TH' ? 'THB' : 'PHP'}）。
      
      【重要数据提取 2：SEO 关键词】
      请提取 5-8 个高流量的本土 SEO 搜索关键词（${context.keywordsLang}），用于电商标题优化。
      
      请严格按照以下 JSON 格式输出数据（包括价格和关键词），放在 Markdown 代码块中：
      \`\`\`json
      ${context.priceJsonExample}
      \`\`\`
      
      请使用清晰的 Markdown 格式输出报告主体（不包含 JSON 数据块）。
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text || "无法生成分析报告。";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    // Parse JSON data
    let priceData: Array<{ name: string; price: number }> = [];
    let keywords: string[] = [];
    let cleanText = responseText;

    try {
      const jsonRegex = /```json\s*(\{[\s\S]*?\})\s*```/;
      const match = responseText.match(jsonRegex);
      
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (parsed.prices) priceData = parsed.prices;
        if (parsed.keywords) keywords = parsed.keywords;
        
        cleanText = responseText.replace(match[0], '').trim();
      }
    } catch (e) {
      console.warn("Failed to parse JSON data", e);
    }

    return {
      text: cleanText,
      groundingChunks: groundingChunks as any,
      priceData: priceData.length > 0 ? priceData : undefined,
      keywords: keywords.length > 0 ? keywords : undefined
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

/**
 * Generate a video using Veo (Market agnostic, visual is visual)
 */
export const generateProductVideo = async (
  base64Image: string,
  mimeType: string,
  prompt: string,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: base64Image,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio,
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned.");

    return `${videoUri}&key=${process.env.API_KEY}`;
  } catch (error) {
    console.error("Veo generation failed:", error);
    throw error;
  }
};

/**
 * Enhance prompt for Veo using Gemini
 */
export const enhanceVideoPrompt = async (originalPrompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Rewrite the following short video prompt into a detailed, cinematic prompt for an AI video generator (Veo).
      Focus on lighting, camera movement, and texture. Keep it under 60 words.
      Input: "${originalPrompt || "Show this product"}"
      Output (just the prompt text):
    `
  });
  return response.text?.trim() || originalPrompt;
};

/**
 * Edit Product Image using Gemini 2.5 Flash Image
 */
export const editProductImage = async (
  base64Image: string,
  mimeType: string,
  editPrompt: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: editPrompt,
          },
        ],
      },
    });

    let imageUrl = '';
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error("No image generated.");
    return imageUrl;

  } catch (error) {
    console.error("Image editing failed:", error);
    throw error;
  }
};

/**
 * Batch Generate Images
 */
export const generateBatchAssets = async (
  base64Image: string,
  mimeType: string,
  prompts: Array<{ id: string; label: string; prompt: string }>
): Promise<Array<{ id: string; label: string; url: string; success: boolean }>> => {
  
  const promises = prompts.map(async (item) => {
    try {
      const url = await editProductImage(base64Image, mimeType, item.prompt);
      return { id: item.id, label: item.label, url, success: true };
    } catch (error) {
      console.error(`Failed to generate ${item.label}`, error);
      return { id: item.id, label: item.label, url: '', success: false };
    }
  });

  return await Promise.all(promises);
};

// --- STYLE CONFIGURATIONS FOR HERO ---
const getHeroStyleInstructions = (style: string) => {
  switch (style) {
    case 'Luxury':
      return `
        **Style: Luxury & Premium (Hi-End)**
        - **Palette**: Black, Deep Gold (#D4AF37), Ivory, Dark Emerald.
        - **Typography**: Elegant Serif for headlines (e.g., Playfair Display vibe), thin Sans-serif for details.
        - **Visuals**: High contrast, dramatic lighting, subtle grain texture, glassmorphism overlays (backdrop-blur).
        - **Layout**: Center-focused, symmetrical, or golden ratio. Minimal text, high negative space.
        - **Decor**: Thin gold borders, diamond/star icons.
      `;
    case 'Minimalist':
      return `
        **Style: Modern Minimalist (Apple/Muji/IKEA)**
        - **Palette**: White, Off-White (#F9F9F9), Soft Gray, accented with black text.
        - **Typography**: Bold, clean Sans-serif (Helvetica/Inter vibe). Massive headings.
        - **Visuals**: Soft diffuse lighting, natural shadows, no harsh borders.
        - **Layout**: Asymmetrical balance, large hero product image.
        - **Decor**: None, or very subtle rounded shapes.
      `;
    case 'Flash Sale':
      return `
        **Style: Mega Campaign / Flash Sale (Shopee/Lazada 9.9)**
        - **Palette**: Electric Orange (#FF5722), Bright Red, Vibrant Yellow.
        - **Typography**: Heavy, Italic, All-Caps Sans-serif. Stroke/Outline text effects.
        - **Visuals**: High saturation, exciting gradients, pop-art vibe.
        - **Layout**: Cluttered but organized chaos. Diagonal section dividers.
        - **Decor**: Lightning bolts, "Sale" tags, confetti, countdown timers, price starbursts.
      `;
    case 'Promotion':
    default:
      return `
        **Style: Trustworthy E-commerce Standard (Official Store)**
        - **Palette**: Brand Blue (Trust) or Mall Red (Official). White background.
        - **Typography**: Clear hierarchy, readable Sans-serif.
        - **Visuals**: Clean cutouts, professional drop shadows.
        - **Layout**: Grid-based, structured, informative.
        - **Decor**: Checkmarks, "Official Store" badges, "Warranty" icons.
      `;
  }
};

/**
 * Generate HTML/Tailwind layout for Product Hero Image (Square)
 */
export const generateHeroHtml = async (
  base64Image: string,
  mimeType: string,
  analysisText: string,
  style: string,
  market: TargetMarket
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const styleInstructions = getHeroStyleInstructions(style);
  
  const marketContext = market === 'TH' 
    ? "Thailand Market (Shopee TH/Lazada TH). Main Copy should be eye-catching." 
    : "Philippines Market (Shopee PH/Lazada PH). Main Copy should be in English (Taglish style allowed).";

  const prompt = `
    You are an award-winning UI/Visual Designer for E-commerce.
    Create a **World-Class Product Hero Image (Main Image)** using HTML and Tailwind CSS.
    
    **Dimensions**: Exactly **800x800 pixels** (Square).
    **Target Audience**: ${marketContext}.
    **Input Analysis**: "${analysisText.substring(0, 300)}..."
    
    ${styleInstructions}

    **Content Requirements**:
    1. **Main Copy**: A catchy, short headline.
    2. **Sub Copy**: Key benefit or spec.
    3. **Tags**: 1-2 visually distinct tags (e.g., "Ready Stock", "Free Shipping", "COD").
    4. **Image**: The product must be the Star. Use \`__PRODUCT_IMG_SRC__\`.
    
    **Technical Constraints**:
    - **NO Old-School Design**: Do not use simple colored rectangles behind text. Use gradients, blurs, shadows, or modern overlays.
    - **Tailwind Config**: You can use arbitrary values like \`bg-[#123456]\`, \`text-[40px]\`.
    - **Container**: Root \`div\` must be \`w-[800px] h-[800px] relative overflow-hidden bg-white\`.
    - **Output**: ONLY raw HTML string. No markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt }
        ]
      }
    });

    let html = response.text || "";
    html = html.replace(/```html/g, '').replace(/```/g, '').trim();
    
    // Inject the real image
    const imageUrl = `data:${mimeType};base64,${base64Image}`;
    html = html.replace(/__PRODUCT_IMG_SRC__/g, imageUrl);

    return html;
  } catch (error) {
    console.error("Hero HTML Generation failed:", error);
    throw error;
  }
};

// --- STYLE CONFIGURATIONS FOR SKU ---
const getSkuStyleInstructions = (style: string) => {
  switch (style) {
    case 'Minimalist':
      return `
        **Style: "Zen Commerce" (Minimalist/Premium)**
        - **Vibe**: Calm, expensive, trustworthy. Like an Apple product page.
        - **Background**: White (#ffffff) or soft gray (#f8f8f8).
        - **Typography**: Dark gray text (#333), ample line height. Headings are small but bold or massive and thin.
        - **Images**: Full-width, edge-to-edge visuals. Rounded corners (rounded-3xl).
        - **UI Elements**: Pill-shaped buttons, subtle borders (border-slate-100), no clutter.
      `;
    case 'High Impact':
      return `
        **Style: "Gen Z / TikTok" (High Impact)**
        - **Vibe**: Exciting, trendy, urgent. Stops the scroll.
        - **Background**: Bold gradients (Purple to Pink), or dark mode with neon accents.
        - **Typography**: Big, loud, condensed fonts. White text on dark backgrounds.
        - **Images**: Cutouts overlapping shapes, tilted angles, dynamic motion.
        - **UI Elements**: "Glass" cards (bg-white/10 backdrop-blur), emoji icons, flashing colors.
      `;
    case 'Feature Comparison':
      return `
        **Style: "Tech Spec" (Informative/Scientific)**
        - **Vibe**: Professional, detailed, convincing. Anker/Dyson engineering style.
        - **Background**: Cool Gray (#F1F5F9) or Navy Blue layout.
        - **Typography**: Monospace font for data/specs. Clean Sans for explanations.
        - **Images**: Exploded views (if possible in prompts), diagrams, macro shots.
        - **UI Elements**: Comparison tables with green checks/red crosses, progress bars, grid layouts.
      `;
    default:
      return `
        **Style: Standard Shopee/Lazada Mobile**
        - **Vibe**: Accessible, clear, sales-focused.
        - **Background**: White with section dividers.
        - **Typography**: Standard readability.
        - **UI Elements**: Voucher coupons style, distinct CTA zones.
      `;
  }
};

/**
 * Generate HTML/Tailwind layout for SKU detail page
 */
export const generateSkuUiLayout = async (
  base64Image: string,
  mimeType: string,
  analysisText: string,
  style: string,
  market: TargetMarket
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const styleInstructions = getSkuStyleInstructions(style);
  const marketContext = market === 'TH' ? "Thailand" : "Philippines";

  const prompt = `
    You are a Senior UI/UX Designer for Global Brands.
    Create a **High-Converting, Mobile-First Product Detail Page** (HTML/Tailwind CSS).
    
    **Context**: Selling to ${marketContext}. Text in **Simplified Chinese** (user will translate later).
    **Input Analysis**: "${analysisText.substring(0, 300)}..."
    
    ${styleInstructions}

    **CRITICAL STRUCTURE REQUIREMENT**: 
    The output must contain exactly **8 distinct sections**.
    **MANDATORY**: Wrap EACH section in a \`<div>\` with class **\`sku-section bg-white mb-0 relative overflow-hidden\`**. 
    (Note: 'bg-white' can be changed based on style, but 'sku-section' and 'relative' are required).
    
    **Section Order & Visuals**:
    1. **Hero Section (首屏)**: Immersive poster. (Img: "Hero+Poster")
    2. **Product Overview (产品全貌)**: Studio shots. (Main Img: \`__PRODUCT_IMG_SRC__\`, Extras: "Side/Back+View")
    3. **Pain Points (核心功能/痛点)**: Problem vs Solution visual. (Img: "Pain+Point", "Solution+Demo")
    4. **Lifestyle Scenario (场景化)**: High-quality life context. (Img: "Lifestyle+Scenario")
    5. **Competitor Comparison (竞品对比)**: Visual chart/table. (Img: "Comparison+Chart")
    6. **Quality Details (细节品质)**: Macro/Texture shots. (Img: "Material+Macro")
    7. **Social Proof (用户口碑)**: Review cards/Stars. (Img: "User+Review")
    8. **Certificates/CTA (资质与购买)**: Trust badges + Sticky-like Buy Button area. (Img: "Certificate")

    **Design Rules**:
    - **Mobile First**: Layout must be perfect for vertical scrolling on phones. Large touch targets.
    - **Visual Hierarchy**: Use gradients, drop-shadows (e.g., \`shadow-2xl\`), and rounded corners (e.g., \`rounded-3xl\`) extensively.
    - **Images**: Use \`<img>\` tags with \`src="https://via.placeholder.com/400x400..."\` and class \`editable-image cursor-pointer object-cover w-full\`.
    - **NO Price Numbers**: Do not invent prices.
    - **Tailwind**: Use arbitrary values if needed (e.g., \`bg-[#fafafa]\`) but prefer standard palette.
    - Return ONLY raw HTML string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt }
        ]
      }
    });

    let html = response.text || "";
    html = html.replace(/```html/g, '').replace(/```/g, '').trim();
    
    const imageUrl = `data:${mimeType};base64,${base64Image}`;
    html = html.replace(/__PRODUCT_IMG_SRC__/g, imageUrl);

    // Modern SVG Placeholders
    html = html.replace(/https:\/\/via\.placeholder\.com\/[^\s"']+/g, (matchUrl) => {
        try {
           const urlObj = new URL(matchUrl);
           const textParam = urlObj.searchParams.get('text');
           const text = textParam ? textParam.replace(/\+/g, ' ') : 'Image Area';
           
           // Generate a subtle colored pattern background for placeholders
           const bgColors = ["#f8fafc", "#f1f5f9", "#e2e8f0"];
           const randomBg = bgColors[Math.floor(Math.random() * bgColors.length)];

           const svgString = `
            <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="${randomBg}"/>
              <path d="M0 400 L400 0" stroke="#cbd5e1" stroke-width="1"/>
              <path d="M0 0 L400 400" stroke="#cbd5e1" stroke-width="1"/>
              <rect width="40%" height="15%" x="30%" y="42.5%" rx="8" fill="white" fill-opacity="0.8"/>
              <text x="50%" y="48%" font-family="sans-serif" font-size="14" font-weight="600" fill="#64748b" dominant-baseline="middle" text-anchor="middle">CLICK TO REPLACE</text>
              <text x="50%" y="54%" font-family="sans-serif" font-size="12" fill="#94a3b8" dominant-baseline="middle" text-anchor="middle">${text}</text>
            </svg>
           `.trim();
           
           const base64Svg = btoa(unescape(encodeURIComponent(svgString)));
           return `data:image/svg+xml;base64,${base64Svg}`;
        } catch (e) {
           return matchUrl;
        }
    });

    return html;
  } catch (error) {
    console.error("SKU UI Generation failed:", error);
    throw error;
  }
};

/**
 * Translate HTML Content (Bidirectional)
 */
export const translateSkuHtml = async (
  htmlContent: string, 
  targetLanguage: 'ph' | 'th' | 'zh',
  market: TargetMarket
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // 1. Extract and replace Base64 images to reduce token usage
  const imgMap = new Map<string, string>();
  let imgIndex = 0;
  
  const cleanedHtml = htmlContent.replace(/src\s*=\s*["'](data:image\/[^"']+)["']/gi, (match, p1) => {
    const placeholder = `__IMG_PLACEHOLDER_${imgIndex++}__`;
    imgMap.set(placeholder, p1);
    return `src="${placeholder}"`;
  });

  let sourceLang = "Simplified Chinese";
  let targetLang = "Simplified Chinese";
  
  if (targetLanguage === 'zh') {
     targetLang = "Simplified Chinese";
     sourceLang = market === 'TH' ? "Thai" : "English";
  } else if (targetLanguage === 'th') {
     sourceLang = "Simplified Chinese";
     targetLang = "Thai (Native E-commerce style)";
  } else if (targetLanguage === 'ph') {
     sourceLang = "Simplified Chinese";
     targetLang = "English (Philippines Market, use terms like 'COD', 'Murang')";
  }

  const prompt = `
    You are a professional translator for Cross-border E-commerce.
    Translate the visible text content of the following HTML code from **${sourceLang}** to **${targetLang}**.
    
    **Rules**:
    1. Keep all HTML tags, structure, classes, and styles EXACTLY the same.
    2. Only translate human-readable text (headings, paragraphs, button labels).
    3. Do NOT translate technical attribute values.
    4. Ensure the translation is natural and uses local e-commerce terminology for ${market === 'TH' ? 'Thailand' : 'Philippines'}.
    5. Return ONLY the translated HTML string. No markdown blocks.

    Input HTML:
    ${cleanedHtml}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    let translatedHtml = response.text || "";
    translatedHtml = translatedHtml.replace(/```html/g, '').replace(/```/g, '').trim();

    // 2. Restore Base64 images
    imgMap.forEach((value, key) => {
      translatedHtml = translatedHtml.split(key).join(value);
    });

    return translatedHtml;
  } catch (error) {
    console.error("Translation failed:", error);
    throw error;
  }
};