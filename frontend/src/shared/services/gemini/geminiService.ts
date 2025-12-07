import { GoogleGenAI, Type } from "@google/genai";
import { Invoice } from '../../types';

// --- Server-Side Chat Function (Preferred for Chat) ---
export const sendMessageToGemini = async (userMessage: string, history: any[]) => {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        }))
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.text || 'AI request failed');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error calling AI service:', error);
    return "I'm having trouble connecting to the server right now. Please ensure the backend is running.";
  }
};

// --- Client-Side Class for OCR (Restored for Documents/Banking) ---
export class GeminiService {
  private ai: GoogleGenAI;
  private modelId: string = 'gemini-1.5-flash';

  constructor() {
    // @ts-ignore - Process.env is polyfilled by Vite
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async parseDocument(base64Data: string, mimeType: string): Promise<any> {
    const model = this.ai.models;
    try {
      const prompt = `Analyze the provided financial document (Invoice/Receipt). Extract: vendor_name, invoice_date (YYYY-MM-DD), total_amount (number), gst_amount (number), summary (max 15 words). Return JSON.`;
      const result = await model.generateContent({
        model: this.modelId,
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vendor_name: { type: Type.STRING, nullable: true },
              invoice_date: { type: Type.STRING, nullable: true },
              total_amount: { type: Type.NUMBER, nullable: true },
              gst_amount: { type: Type.NUMBER, nullable: true },
              summary: { type: Type.STRING, nullable: true },
            }
          },
          temperature: 0.1
        }
      });

      return JSON.parse(result.text || "{}");
    } catch (e) {
      console.error("OCR Failed", e);
      return { summary: "Failed to analyze document." };
    }
  }

  // Parses a Bank Statement to extract transactions
  async parseBankStatement(base64Data: string, mimeType: string): Promise<any[]> {
    const model = this.ai.models;
    try {
      const prompt = `Extract bank transactions from this statement. Return a JSON array of objects with keys: date (YYYY-MM-DD), description, withdrawal (number, 0 if empty), deposit (number, 0 if empty).`;
      const result = await model.generateContent({
        model: this.modelId,
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                description: { type: Type.STRING },
                withdrawal: { type: Type.NUMBER },
                deposit: { type: Type.NUMBER }
              }
            }
          },
          temperature: 0.1
        }
      });
      return JSON.parse(result.text || "[]");
    } catch (e) {
      console.error("Bank Parse Failed", e);
      return [];
    }
  }
}