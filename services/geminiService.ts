
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { Invoice, InvoiceStatus } from "../types";

// --- Mock Database Access for AI ---
const getInvoices = (invoices: Invoice[], status?: string): Invoice[] => {
  if (!status) return invoices;
  return invoices.filter(inv => inv.status.toLowerCase() === status.toLowerCase());
};

const getTotalRevenue = (invoices: Invoice[]): number => {
  return invoices.reduce((acc, curr) => acc + curr.total, 0);
};

// --- Function Declarations ---

const listInvoicesTool: FunctionDeclaration = {
  name: 'listInvoices',
  description: 'List invoices, optionally filtered by status (e.g., Paid, Overdue, Draft).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: {
        type: Type.STRING,
        description: 'The status to filter by (Paid, Overdue, Sent, Draft)',
      },
    },
  },
};

const getFinancialSummaryTool: FunctionDeclaration = {
  name: 'getFinancialSummary',
  description: 'Get the total revenue and outstanding amount summary.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

// --- Service Class ---

export class GeminiService {
  private ai: GoogleGenAI;
  private modelId: string = 'gemini-2.5-flash';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async sendMessage(
    history: any[], 
    message: string, 
    contextData: { invoices: Invoice[] }
  ): Promise<string> {
    
    const tools = [
      {
        functionDeclarations: [listInvoicesTool, getFinancialSummaryTool],
      },
    ];

    const model = this.ai.models;
    const systemInstruction = `You are the GRX10 Financial Assistant. 
    You help Indian business owners manage their finances. 
    Currency is INR (₹). 
    Always be professional, concise, and helpful.
    Use the available tools to fetch real-time data. 
    If the user asks about data you don't have, check if a tool can retrieve it.`;

    try {
      const result = await model.generateContent({
        model: this.modelId,
        contents: [
          ...history, 
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          tools: tools,
          temperature: 0.2, 
        },
      });

      const functionCalls = result.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        const functionResponses = [];
        for (const fc of functionCalls) {
          let functionResult: any = {};
          if (fc.name === 'listInvoices') {
             const status = fc.args['status'] as string | undefined;
             const data = getInvoices(contextData.invoices, status);
             functionResult = { count: data.length, invoices: data.map(i => ({ number: i.number, amount: i.total, status: i.status, customer: i.customerName })) };
          } else if (fc.name === 'getFinancialSummary') {
             const total = getTotalRevenue(contextData.invoices);
             const overdue = contextData.invoices
                .filter(i => i.status === InvoiceStatus.OVERDUE)
                .reduce((acc, curr) => acc + curr.total, 0);
             functionResult = { totalRevenue: total, overdueAmount: overdue };
          }
          functionResponses.push({
            functionResponse: {
              name: fc.name,
              response: { result: functionResult },
              id: fc.id
            }
          });
        }

        const responseContent = result.candidates?.[0]?.content;
        const finalResult = await model.generateContent({
          model: this.modelId,
          contents: [
            ...history,
            { role: 'user', parts: [{ text: message }] },
            responseContent!,
            { role: 'tool', parts: functionResponses }
          ],
          config: { systemInstruction }
        });

        return finalResult.text || "Processed data but no summary generated.";
      }
      return result.text || "I understood, but have no specific answer.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "I'm having trouble connecting to the financial brain right now. Please ensure the API Key is valid.";
    }
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
