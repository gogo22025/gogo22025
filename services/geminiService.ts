
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini API using the API key from environment variables directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSmartBusinessInsight = async (dataSummary: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `بصفتك مستشار أعمال ذكي، قم بتحليل البيانات التالية لشركة توزيع (مواد غذائية ومجمدات وألعاب وملابس) في مصر، مع مراعاة أن العملة هي الجنيه المصري (EGP). قدم نصيحة استراتيجية واحدة، ملخصاً للحالة، وتوقعاً للمبيعات القادمة باللغة العربية: \n\n${dataSummary}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "ملخص الحالة الحالية للعمل" },
            advice: { type: Type.STRING, description: "نصيحة استراتيجية للنمو" },
            forecast: { type: Type.STRING, description: "توقع مستقبلي قصير المدى" }
          },
          required: ["summary", "advice", "forecast"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      summary: "تعذر الحصول على الملخص الذكي حالياً.",
      advice: "يرجى التحقق من اتصال الإنترنت أو مفتاح API.",
      forecast: "غير متاح."
    };
  }
};
