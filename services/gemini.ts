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
    You are an expert UI/UX designer for E-commerce (Shopee/Lazada/TikTok Shop).
    Create a responsive HTML component using Tailwind CSS for a product detail section.
    
    Goal: Create a highly converting detail page layout that intersperses selling point text with images.
    
    Input Analysis: "${analysisText || 'Analyze the image to find selling points.'}"
    Target Style: "${style}"

    Requirements:
    1. **Layout Structure**: Use a mobile-first column layout.
    2. **Selling Points**: Extract 3-4 KEY selling points (e.g., Material, Function, Size, Scenario).
    3. **Image Placeholders**: For EACH selling point, insert an \`<img>\` tag.
       - **CRITICAL**: The \`src\` of these images MUST be a placeholder URL that describes what kind of image is needed.
       - Format: \`https://via.placeholder.com/400x300/e2e8f0/64748b?text=PLACEHOLDER_TEXT\`
       - Replace \`PLACEHOLDER_TEXT\` with the specific type of image needed, e.g., "Detail+Shot", "Waterproof+Test", "Lifestyle+Scene", "Size+Chart".
       - Add a specific class \`editable-image\` to all these images.
       - Add \`cursor-pointer\` class and hover effects to indicate they are interactive.
    4. **Header Image**: Use the provided product image as the main header image (use \`__PRODUCT_IMG_SRC__\` placeholder).
    5. **Buttons**: Sticky bottom "Buy Now" button.
    6. **Styling**: Use Tailwind. Make it look professional and Thai-market friendly (vibrant but trustworthy).
    7. **Output**: Return ONLY raw HTML. No markdown blocks.

    Example structure logic:
    - [Main Image]
    - [Price & Title]
    - [Selling Point 1 Title] -> [Description] -> [Image Placeholder: Detail Shot]
    - [Selling Point 2 Title] -> [Description] -> [Image Placeholder: Usage Scene]
    - [Specs Table]
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

    return html;
  } catch (error) {
    console.error("SKU UI Generation failed:", error);
    throw error;
  }
};