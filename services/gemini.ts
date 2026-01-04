import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AnalysisData } from "../types";

/**
 * Analyze product image for Thai market using Search Grounding
 */
export const analyzeProductForThaiMarket = async (
  base64Image: string,
  mimeType: string,
  additionalPrompt: string
): Promise<AnalysisData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `
      你是一位针对泰国市场的跨境电商专家分析师。
      请分析这张产品图片。
      
      请提供一份综合性的中文报告，包含以下内容：
      1. 产品识别 (Product Identification)。
      2. 泰国市场适应性 (Market Suitability) - 是否符合当地趋势？季节性如何？
      3. 竞品分析 (Competitor Analysis) - 参考 Shopee TH, Lazada TH, TikTok Shop Thailand 的趋势。
      4. 定价策略 (Pricing Strategy) - 预估泰铢 (THB) 价格区间。
      5. 营销角度 (Marketing Angles) - 文化细微差别。
      
      用户备注: ${additionalPrompt}
      
      【重要数据提取 1：价格】
      请根据分析，提供 Shopee TH, Lazada TH, TikTok Shop 三个平台的【预估平均售价】（单位：泰铢）。
      
      【重要数据提取 2：SEO 关键词】
      请提取 5-8 个高流量的泰语 (Thai) SEO 搜索关键词，用于电商标题优化。
      
      请严格按照以下 JSON 格式输出数据（包括价格和关键词），放在 Markdown 代码块中：
      \`\`\`json
      {
        "prices": [
          { "name": "Shopee TH", "price": 450 },
          { "name": "Lazada TH", "price": 480 },
          { "name": "TikTok Shop", "price": 420 }
        ],
        "keywords": ["รองเท้าผ้าใบ", "แฟชั่นเกาหลี", "ราคาถูก", "ส่งฟรี"]
      }
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
 * Generate a video using Veo
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
 * Generate HTML/Tailwind layout for SKU detail page
 */
export const generateSkuUiLayout = async (
  base64Image: string,
  mimeType: string,
  analysisText: string,
  style: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are an expert UI/UX designer for Cross-border E-commerce targeting Thailand.
    Create a highly converting, mobile-first Product Detail Page (HTML/Tailwind CSS).
    
    **Language Requirement**: 
    All visible text (Headings, Descriptions, Selling Points, Buttons) MUST be in **Simplified Chinese (简体中文)** first. 
    (The user will verify the copy in Chinese, and translate it to Thai later).

    **Input Analysis**: "${analysisText || 'Analyze the image to find selling points.'}"
    **Target Style**: "${style}"

    **CRITICAL REQUIREMENT**: You MUST follow this specific 10-step section order to maximize conversion (Attract -> Inform -> Solve -> Imagine -> Compare -> Trust -> Proof -> Guarantee -> Action):

    1. **Hero Section (3-Second Hook)**: 
       - Large visual impact poster style. 
       - Overlay a punchy "One-sentence Core Selling Point" + "Limited Time Offer".
       - Image Placeholder: "Poster+Key+Visual+Impact".
    
    2. **Product Overview (Cognition)**:
       - Multi-angle display (Front, Side, Details) + Basic specs (Size, Color, Material).
       - Use the main product image (placeholder \`__PRODUCT_IMG_SRC__\`) for the "Front View".
       - Additional Placeholders: "Side+View+Clean", "Back+View+Details".

    3. **Pain Points & Solutions**:
       - Structure: "User Pain Point" -> "Product Solution" -> "Evidence".
       - Image Placeholders: "User+Pain+Point+Scenario", "Solution+Demonstration".

    4. **Scenario/Lifestyle (Immersion)**:
       - Show the product being used in real Thai life contexts.
       - Image Placeholder: "Lifestyle+In+Use+Context".

    5. **Competitor Comparison**:
       - A comparison table or visual (Us vs. Others).
       - Highlight advantages (Price, Quality, Function).
       - Image Placeholder: "Comparison+Chart+Visual".

    6. **Quality Details (Trust)**:
       - Macro shots of material, stitching, or durability tests.
       - Image Placeholders: "Material+Zoom+Texture", "Durability+Test+Result".

    7. **Social Proof**:
       - Mockup of 1-2 User Reviews/Testimonials with star ratings.
       - Image Placeholder: "User+Selfie+With+Product".

    8. **Certificates/Trust**:
       - Section for patents, quality checks, or brand guarantees.
       - Image Placeholder: "Official+Certificate+Badge".

    9. **After-sales/Policies**:
       - Clear icons/text for "7-Day Return", "Warranty", "Fast Shipping".

    10. **Sticky Bottom CTA**:
        - "Buy Now" / "Add to Cart" button with Branding.

    **Technical Constraints**:
    - Use Tailwind CSS for all styling.
    - **Interactive Images**: For every image area, use an \`<img>\` tag with this specific source format:
      \`https://via.placeholder.com/400x400/e2e8f0/64748b?text=Specific+Visual+Description\`
      (e.g., text=Fabric+Texture+Zoom, text=Model+Holding+Bag, text=Waterproof+Test).
      The text MUST be descriptive enough for the user to know exactly what image to upload there. Do NOT use generic text like "Image" or "Photo".
    - Add class \`editable-image\` and \`cursor-pointer\` to all images.
    - Add \`crossorigin="anonymous"\` attribute to all \`<img>\` tags.
    - Use the provided placeholder \`__PRODUCT_IMG_SRC__\` for the main Hero or Product Overview image.
    - Return ONLY raw HTML string. No markdown code blocks.
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
    // Cleanup potential markdown formatting
    html = html.replace(/```html/g, '').replace(/```/g, '').trim();
    
    // Inject the real image back into the main slot
    const imageUrl = `data:${mimeType};base64,${base64Image}`;
    html = html.replace(/__PRODUCT_IMG_SRC__/g, imageUrl);

    // Replace external via.placeholder.com URLs with local inline SVG Data URIs
    html = html.replace(/https:\/\/via\.placeholder\.com\/[^\s"']+/g, (matchUrl) => {
        try {
           const urlObj = new URL(matchUrl);
           const textParam = urlObj.searchParams.get('text');
           const text = textParam ? textParam.replace(/\+/g, ' ') : 'Image Area';
           
           const svgString = `
            <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#f1f5f9"/>
              <rect width="98%" height="98%" x="1%" y="1%" fill="none" stroke="#cbd5e1" stroke-width="4" stroke-dasharray="12,12"/>
              <text x="50%" y="45%" font-family="sans-serif" font-size="24" font-weight="bold" fill="#94a3b8" dominant-baseline="middle" text-anchor="middle">REPLACE</text>
              <text x="50%" y="55%" font-family="sans-serif" font-size="16" fill="#64748b" dominant-baseline="middle" text-anchor="middle">${text}</text>
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
 * Translate HTML Content to Thai
 */
export const translateHtmlToThai = async (htmlContent: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    You are a professional translator for Thai E-commerce.
    Translate the visible text content of the following HTML code from **Simplified Chinese** to **Thai**.
    
    **Rules**:
    1. Keep all HTML tags, structure, classes, and styles EXACTLY the same.
    2. Only translate human-readable text (headings, paragraphs, button labels).
    3. Do NOT translate technical attribute values (like class names, ids, data attributes).
    4. Ensure the Thai translation is natural and uses e-commerce terminology (e.g., Shopee/Lazada style).
    5. Return ONLY the translated HTML string. No markdown blocks.

    Input HTML:
    ${htmlContent}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    let translatedHtml = response.text || "";
    translatedHtml = translatedHtml.replace(/```html/g, '').replace(/```/g, '').trim();
    return translatedHtml;
  } catch (error) {
    console.error("Translation failed:", error);
    throw error;
  }
};
