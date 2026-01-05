import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AnalysisData, TargetMarket } from "../types";

/**
 * Analyze product image for Specific Market (TH, PH, VN, MY, SG, ID) using Search Grounding
 */
export const analyzeProduct = async (
  base64Image: string,
  mimeType: string,
  additionalPrompt: string,
  market: TargetMarket
): Promise<AnalysisData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Dynamic Configuration based on Market - Upgraded for Deep Analysis
  const getMarketContext = (m: TargetMarket) => {
    switch (m) {
      case 'TH': return {
        role: "针对泰国市场 (Thailand) 的高级跨境电商战略专家",
        currency: "泰铢 (THB)",
        platforms: "Shopee TH, Lazada TH, TikTok Shop Thailand, Line Shopping, Konvy (美妆)",
        culture: "注重视觉营销 (直播/短视频)、KOL 影响力大、偏好鲜艳色彩、佛教节日营销、Line 社交电商普及。",
        keywordsLang: "泰语 (Thai)",
        priceJsonExample: `{ "prices": [{ "name": "Shopee TH", "price": 450 }, { "name": "Lazada TH", "price": 490 }, { "name": "TikTok Shop", "price": 420 }], "keywords": ["รองเท้า", "แฟชั่น", "ราคาถูก", "ส่งฟรี"] }`
      };
      case 'VN': return {
        role: "针对越南市场 (Vietnam) 的高级跨境电商战略专家",
        currency: "越南盾 (VND)",
        platforms: "Shopee VN, Lazada VN, TikTok Shop Vietnam, Tiki (注重正品), Sendo, Facebook Marketplace (极度活跃)",
        culture: "价格高度敏感、年轻化人口红利、Zalo/Facebook 社交电商极其发达、摩托车出行文化（防晒/雨具）、货到付款 (COD) 仍占主流。",
        keywordsLang: "越南语 (Vietnamese)",
        priceJsonExample: `{ "prices": [{ "name": "Shopee VN", "price": 150000 }, { "name": "Tiki", "price": 180000 }, { "name": "Facebook", "price": 140000 }], "keywords": ["giày dép", "thời trang", "giá rẻ", "freeship"] }`
      };
      case 'MY': return {
        role: "针对马来西亚市场 (Malaysia) 的高级跨境电商战略专家",
        currency: "马来西亚林吉特 (MYR)",
        platforms: "Shopee MY, Lazada MY, TikTok Shop Malaysia, PG Mall, Zalora (时尚)",
        culture: "三大种族 (马来/华/印) 融合、伊斯兰教 Halal 认证 (食品/美妆)、对华流/韩流接受度高、西马东马物流时效差异大。",
        keywordsLang: "英语 (English) 或马来语 (Malay)",
        priceJsonExample: `{ "prices": [{ "name": "Shopee MY", "price": 45.50 }, { "name": "Lazada MY", "price": 49.00 }, { "name": "Zalora", "price": 79.00 }], "keywords": ["Baju", "Fashion", "Murah", "Ready Stock"] }`
      };
      case 'SG': return {
        role: "针对新加坡市场 (Singapore) 的高级跨境电商战略专家",
        currency: "新加坡元 (SGD)",
        platforms: "Shopee SG, Lazada SG, Amazon SG, Qoo10, Carousell (二手/C2C), Zalora",
        culture: "极高消费力、英语为主、追求配送时效 (Next Day Delivery)、品牌意识强、空间有限 (收纳/小家电受欢迎)、西化生活方式。",
        keywordsLang: "英语 (English)",
        priceJsonExample: `{ "prices": [{ "name": "Shopee SG", "price": 25.90 }, { "name": "Amazon SG", "price": 29.90 }, { "name": "Lazada SG", "price": 26.50 }], "keywords": ["Dress", "Office Wear", "Premium", "Fast Delivery"] }`
      };
      case 'ID': return {
        role: "针对印尼市场 (Indonesia) 的高级跨境电商战略专家",
        currency: "印尼卢比 (IDR)",
        platforms: "Shopee ID, Tokopedia (本土巨头), Lazada ID, TikTok Shop, Bukalapak, Blibli",
        culture: "世界最大的穆斯林国家 (注意宗教禁忌)、千岛之国 (物流成本高/慢)、移动端渗透率极高、喜爱促销折扣 (Tanggal Kembar)、本土品牌保护主义。",
        keywordsLang: "印尼语 (Bahasa Indonesia)",
        priceJsonExample: `{ "prices": [{ "name": "Shopee ID", "price": 85000 }, { "name": "Tokopedia", "price": 90000 }, { "name": "TikTok Shop", "price": 82000 }], "keywords": ["Sepatu", "Wanita", "Promo", "COD"] }`
      };
      case 'PH': default: return {
        role: "针对菲律宾市场 (Philippines) 的高级跨境电商战略专家",
        currency: "菲律宾比索 (PHP)",
        platforms: "Shopee PH, Lazada PH, TikTok Shop Philippines, Zalora, Facebook Marketplace",
        culture: "深受美式文化影响、英语普及率高、天主教节日多 (圣诞节极长)、极其依赖 COD (货到付款)、对价格敏感但喜欢赠品 (Freebie)、喜欢色彩鲜艳风格。",
        keywordsLang: "英语 (English) 或他加禄语 (Tagalog)",
        priceJsonExample: `{ "prices": [{ "name": "Shopee PH", "price": 450 }, { "name": "Lazada PH", "price": 480 }, { "name": "TikTok Shop", "price": 430 }], "keywords": ["Rubber Shoes", "Murang Sapatos", "Sale", "Free Shipping"] }`
      };
    }
  };

  const context = getMarketContext(market);

  try {
    const prompt = `
      你是一位${context.role}。你的任务是深入剖析这张产品图片，挖掘其在 ${market} 市场的爆款潜力。
      
      请结合 Google Search Grounding 能力，实时调研当前${context.platforms}等平台的数据，生成一份详尽的《跨境电商选品与营销报告》。
      
      报告结构如下（请使用 Markdown 格式）：

      ## 1. 产品核心识别 (Product DNA)
      - **品类定义**: 准确的类目归属。
      - **核心卖点**: 3个最打动${market}用户的卖点。
      - **目标人群**: 具体的画像（例如：雅加达职场女性 / 胡志明市大学生）。

      ## 2. ${market} 市场深度适配性
      - **文化契合度**: 分析该产品是否符合当地(${context.culture})。是否存在宗教/习俗禁忌？
      - **季节/气候**: 是否适应当地常年热带或雨季气候？
      - **竞争格局**: 当前市场是红海（价格战）还是蓝海（稀缺）？

      ## 3. 多平台定价与竞品分析
      - 请列出至少 3 个主要平台 (${context.platforms}) 上类似产品的**真实在售价格区间**。
      - 它们的主图风格是怎样的？（如：简约风 vs 促销牛皮癣风）。

      ## 4. 本土化营销策略 (Killer Angles)
      - **痛点营销**: 针对当地痛点（如：防潮、美白、省空间）的话术建议。
      - **场景建议**: 适合拍摄什么样的 TikTok 短视频？（例如：摩托车通勤场景、斋月家庭聚会）。
      - **促销建议**: 适合参加什么大促？（如：Shopee 9.9, 双11, 斋月, 泼水节, 发薪日大促）。

      ## 5. 关键结论
      - **选品建议**: 推荐指数 (1-5星) 及理由。

      用户额外备注: ${additionalPrompt}
      
      ---
      【数据提取 - 务必准确】
      请基于你的分析，输出 JSON 格式的关键数据，包含：
      1. \`prices\`: 针对${context.platforms}中至少3个平台的预估售价。
      2. \`keywords\`: 5-8 个高流量的本土 SEO 搜索关键词 (${context.keywordsLang})，请包含长尾词。

      请严格按照以下 JSON 格式输出数据块：
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
  market: TargetMarket,
  additionalPrompt?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const styleInstructions = getHeroStyleInstructions(style);
  
  let marketContext = "Southeast Asia Market";
  if (market === 'TH') marketContext = "Thailand (Shopee TH). Vibrant, colorful.";
  if (market === 'VN') marketContext = "Vietnam (Shopee VN). Price focus, clear info.";
  if (market === 'PH') marketContext = "Philippines (Shopee PH). English/Taglish.";
  if (market === 'MY') marketContext = "Malaysia. Multicultural, Halal-friendly if food.";
  if (market === 'SG') marketContext = "Singapore. Premium, Clean, English.";
  if (market === 'ID') marketContext = "Indonesia. Bahasa Indonesia, Mobile-first.";

  const prompt = `
    You are an award-winning UI/Visual Designer for E-commerce.
    Create a **World-Class Product Hero Image (Main Image)** using HTML and Tailwind CSS.
    
    **Dimensions**: Exactly **800x800 pixels** (Square).
    **Target Audience**: ${marketContext}.
    **Input Analysis**: "${analysisText.substring(0, 300)}..."
    
    ${styleInstructions}

    **USER CUSTOM INSTRUCTIONS**: "${additionalPrompt || "None"}"
    (CRITICAL: If the user provides instructions above, prioritize them over the default style. For example, if they ask for 'Pink Theme', use pink regardless of the selected style).

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
    case 'K-Pop / Y2K':
      return `
        **Style: "Gen Z / K-Pop / Y2K" (Trendy & Viral)**
        - **Target**: Young consumers in Vietnam, Thailand, Philippines.
        - **Vibe**: High energy, chaotic but aesthetic, sticker-bomb style.
        - **Palette**: Hot Pink (#FF00CC), Acid Green, Electric Blue on Black or Stark White.
        - **Typography**: Mixed fonts (Chunky Sans + Handwritten). Large outlined text.
        - **Visuals**: Uneven borders, star shapes, marquee scrolling text (simulated), brutality.
        - **Layout**: Asymmetric grids, overlapping elements (stickers over images).
      `;
    case 'Cyberpunk Tech':
      return `
        **Style: "Cyberpunk / High-Tech" (Electronics/Gadgets)**
        - **Target**: Tech enthusiasts in Singapore, Malaysia.
        - **Vibe**: Futuristic, precision, dark mode.
        - **Background**: Deep Dark Blue/Black (#0f172a) with Neon Glows (Cyan/Magenta).
        - **Typography**: Monospace fonts for specs (data visualization style).
        - **Visuals**: Grid lines, crosshairs, glassmorphism cards (backdrop-blur).
        - **Layout**: "Bento Box" grids, technical readouts, progress bars.
      `;
    case 'Muji Minimalist':
      return `
        **Style: "Muji / Scandinavian" (Home & Living)**
        - **Target**: Premium buyers in Singapore, Thailand.
        - **Vibe**: Zen, clean, expensive, organic.
        - **Palette**: Warm White, Cream (#FDFBF7), Sage Green, Earthy Browns.
        - **Visuals**: Massive soft rounded corners (rounded-[40px]), organic blob shapes behind images.
        - **Typography**: Elegant Serif headers, lots of whitespace.
        - **Layout**: Editorial magazine style. Floating images. No harsh borders.
      `;
    case 'Classic Conversion':
    default:
      return `
        **Style: "Shopee/Lazada Gold Standard" (High Conversion)**
        - **Target**: Mass market, price-sensitive.
        - **Vibe**: Urgent, clear, professional.
        - **Palette**: Trust Blue or Sale Red/Orange.
        - **Visuals**: Coupon-style borders (dashed), clear "Free Shipping" badges.
        - **Layout**: Very structured, linear flow. Hero -> Pain Point -> Soluton -> Social Proof.
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
  market: TargetMarket,
  additionalPrompt?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const styleInstructions = getSkuStyleInstructions(style);
  
  const marketNames: Record<string, string> = {
    'TH': 'Thailand', 'PH': 'Philippines', 'VN': 'Vietnam', 
    'MY': 'Malaysia', 'SG': 'Singapore', 'ID': 'Indonesia'
  };
  const marketContext = marketNames[market] || "Southeast Asia";

  const prompt = `
    You are a World-Class UI/Visual Designer.
    Create a **High-Converting Product Detail Page** (HTML/Tailwind CSS) that looks like a **Top-Tier Brand Landing Page**.
    
    **Context**: Selling to ${marketContext}. Text in **Simplified Chinese** (user will translate later).
    **Input Analysis**: "${analysisText.substring(0, 300)}..."
    
    ${styleInstructions}

    **USER CUSTOM INSTRUCTIONS**: "${additionalPrompt || "None"}"
    (CRITICAL: The user has full control. If they ask for 'Black and Gold luxury' or 'Remove the certificates section', YOU MUST OBEY. Incorporate specific color requests, mood, or structural changes).

    **CRITICAL DESIGN RULES (BREAK THE GRID)**:
    1. **NO BORING LISTS**: Do not just stack white boxes. Use **Magazine Layouts**.
    2. **Overlapping**: Allow text to overlap images slightly (using negative margins or absolute position).
    3. **Asymmetry**: Use grid-cols-12. Make some sections 7cols vs 5cols.
    4. **Backgrounds**: Use full-width background images with overlay gradients for the Hero and Lifestyle sections.
    5. **Typography**: Use massive contrast. Huge headlines (text-5xl) vs tiny technical specs (text-xs).
    
    **Structure (Optimize flow for ${marketContext})**:
    Create **6 to 10 sections** that best sell THIS specific product. Common sections:
    - **Hero**: Immersive, full screen feel.
    - **Hook**: The "Why".
    - **Features**: Visual grid.
    - **Social Proof**: Reviews/Trust.
    - **Offer**: Sticky-feel CTA.

    **Technical Requirements**:
    - Wrap EACH section in \`<div class="sku-section relative overflow-hidden ...">\`.
    - **Images**: Use \`<img>\` tags with \`src="https://via.placeholder.com/400x400..."\` and class \`editable-image cursor-pointer object-cover w-full\`.
    - **Icons**: Use generic SVG shapes or Lucide-like SVG paths if needed, or simple emoji.
    - **Tailwind**: Use arbitrary values (e.g. \`bg-[#123]\`, \`rounded-[3rem]\`) for unique flair.
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
  
  // Basic mapping for target language if not ZH
  if (targetLanguage === 'zh') {
     targetLang = "Simplified Chinese";
     sourceLang = "Local Language (Thai/English/Vietnamese/etc)";
  } else {
     sourceLang = "Simplified Chinese";
     if (market === 'TH') targetLang = "Thai";
     else if (market === 'VN') targetLang = "Vietnamese";
     else if (market === 'ID') targetLang = "Bahasa Indonesia";
     else if (market === 'MY') targetLang = "English/Malay Mix";
     else targetLang = "English (E-commerce context)";
  }

  const prompt = `
    You are a professional translator for Cross-border E-commerce.
    Translate the visible text content of the following HTML code from **${sourceLang}** to **${targetLang}**.
    
    **Rules**:
    1. Keep all HTML tags, structure, classes, and styles EXACTLY the same.
    2. Only translate human-readable text (headings, paragraphs, button labels).
    3. Do NOT translate technical attribute values.
    4. Ensure the translation is natural and uses local e-commerce terminology for ${market}.
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