import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { Invoice, InvoiceStatus } from "../types";

// --- Mock Database Access for AI ---
// In a real app, these would be API calls to the backend
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
    // Assuming process.env.API_KEY is available in the environment
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

    // Construct a specialized prompt with context awareness if needed, 
    // but relying on function calling is better for data retrieval.
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
          ...history, // Past conversation
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          tools: tools,
          temperature: 0.2, // Low temperature for factual financial data
        },
      });

      const functionCalls = result.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        // Handle Function Execution
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

        // Send function result back to model for final answer
        const responseContent = result.candidates?.[0]?.content;
        
        const finalResult = await model.generateContent({
          model: this.modelId,
          contents: [
            ...history,
            { role: 'user', parts: [{ text: message }] },
            responseContent!, // The model's request to call function
            { role: 'tool', parts: functionResponses } // The result of the function
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
        const prompt = `You are an expert financial data extraction AI. 
        Analyze the provided document (image or PDF) which is expected to be an invoice, receipt, or bill.
        
        Extract the following fields with high precision:
        1. vendor_name: The name of the entity issuing the document.
        2. invoice_date: The date of the transaction (Format: YYYY-MM-DD).
        3. total_amount: The final grand total amount (Numeric).
        4. gst_amount: The total tax/GST amount (Numeric). If not explicitly stated, assume 0.
        5. summary: A concise (max 20 words) summary of the items or services purchased.

        Return ONLY a valid JSON object with keys: "vendor_name", "invoice_date", "total_amount", "gst_amount", "summary".
        If a field is not found or the document is not readable, set the value to null.`;

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
                temperature: 0.1 // Lower temperature for more deterministic extraction
            }
        });
        
        const text = result.text;
        if (!text) return { error: "No content generated" };
        
        return JSON.parse(text);
    } catch (e) {
        console.error("OCR Failed", e);
        // Graceful fallback
        return {
            vendor_name: null,
            invoice_date: null,
            total_amount: null,
            gst_amount: null,
            summary: "Error analyzing document."
        };
    }
  }
}