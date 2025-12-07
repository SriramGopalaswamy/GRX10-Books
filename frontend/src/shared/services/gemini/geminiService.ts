
import { GoogleGenAI, Type } from "@google/genai";
import { Goal, Memo, OSUser as User, Employee, HRMSRole as Role, RegularizationRequest, LeaveStatus } from "../../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
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
    try {
      const response = await this.ai.models.generateContent({
        model: this.modelId,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              },
              {
                text: "Extract all text, tables, and structured data from this document. Return as JSON with fields: title, date, amount, items (array), summary."
              }
            ]
          }
        ]
      });
      
      const text = response.text || '';
      // Try to parse as JSON, fallback to text
      try {
        return JSON.parse(text);
      } catch {
        return { text, summary: text.substring(0, 200) };
      }
    } catch (error) {
      console.error("Gemini OCR Error:", error);
      throw new Error("Failed to parse document");
    }
  }

  async parseBankStatement(base64Data: string, mimeType: string): Promise<any[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.modelId,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              },
              {
                text: "Extract all bank transactions from this statement. Return as JSON array with fields: date (YYYY-MM-DD), description, withdrawal (number or 0), deposit (number or 0)."
              }
            ]
          }
        ]
      });
      
      const text = response.text || '';
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // Fallback: return empty array if parsing fails
        console.warn("Could not parse bank statement as JSON:", text);
        return [];
      }
    } catch (error) {
      console.error("Gemini Bank Statement Error:", error);
      throw new Error("Failed to parse bank statement");
    }
  }
}

// --- Server-Side Chat Function (Preferred for Chat) ---
export const sendMessageToGemini = async (userMessage: string, history: any[]): Promise<string> => {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: userMessage, 
        history: history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }))
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    return data.text || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Error calling AI API:', error);
    throw error;
  }
};

export const critiqueMemo = async (memo: Partial<Memo>): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "AI Service Unavailable: Missing API Key";

  const prompt = `
    Act as a brutally honest executive at Cypress Semiconductor or Amazon. 
    Review this memo for clarity, brevity, and ROI focus. 
    The culture demands "No Fluff".
    
    Subject: ${memo.subject || ''}
    Summary & Content: ${memo.summary || ''}
    Attachments: ${memo.attachments?.map(a => a.name).join(', ') || 'None'}

    Provide a short, bulleted critique on how to improve this memo to be more quantitative and direct.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No feedback generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating critique.";
  }
};

export const optimizeGoal = async (goalDescription: string): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "AI Service Unavailable";

  const prompt = `
    Refine the following goal to be strictly SMART (Specific, Measurable, Achievable, Relevant, Time-bound).
    It must have a numeric baseline and a numeric target.
    
    Current Draft: "${goalDescription}"
    
    Output a suggested Title, Metric, Baseline (number), and Target (number) in a concise format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No suggestion generated.";
  } catch (error) {
    return "Error generating goal suggestion.";
  }
};

export const queryKnowledgeBase = async (query: string, goals: Goal[], memos: Memo[], users: User[]): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "AI Service Unavailable";

  // Helper to resolve names
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  // Enrich Data with Names
  const enrichedGoals = goals.map(g => ({
    title: g.title,
    owner: getUserName(g.ownerId),
    status: g.status,
    progress: `${g.current}/${g.target} ${g.metric}`,
    comments: g.comments?.map(c => `${getUserName(c.authorId)}: ${c.text}`).join(' | ')
  }));

  const enrichedMemos = memos.map(m => ({
    subject: m.subject,
    from: getUserName(m.fromId),
    to: m.toId === 'ALL' ? 'Leadership Team' : getUserName(m.toId),
    date: m.date,
    summary: m.summary,
    status: m.status
  }));

  const context = `
    You are an intelligent assistant for GRX10, a company focusing on renewable energy and marketing.
    You have access to the company's internal goals, memos, and related tasks.
    
    Interpret "tasks" or "action items" by looking for:
    1. The "Ask" or "Solution" section in Memos (Memos are requests for action).
    2. Explicit questions or requests in Goal Comments.
    
    CURRENT GOALS DATABASE:
    ${JSON.stringify(enrichedGoals, null, 2)}

    CURRENT MEMOS DATABASE:
    ${JSON.stringify(enrichedMemos, null, 2)}

    USER QUESTION: "${query}"

    Answer the user's question based STRICTLY on the provided data. 
    If the answer isn't in the data, say so. 
    Be concise and helpful.
    When referring to people, use their names.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: context,
    });
    return response.text || "I couldn't find an answer to that.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I'm having trouble accessing the knowledge base right now.";
  }
};

// HRMS Function: Generate Job Description
export const generateJobDescription = async (role: string, department: string, skills: string): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a professional Job Description for a ${role} in the ${department} department at GRX10. 
      Required skills: ${skills}. 
      Include Responsibilities, Requirements, and a section on "Why Join GRX10?". Output in Markdown format.`,
    });
    return response.text || "Failed to generate JD.";
  } catch (error) {
    console.error("Gemini JD Gen Error:", error);
    return "Error generating description.";
  }
};

// HRMS HR Assistant Functions
export interface HRResponse {
  text: string;
  payslip?: {
    month: string;
    year: string;
    netPay: number;
  };
  showRegularizationForm?: boolean;
  regularizationList?: RegularizationRequest[];
  isApprovalList?: boolean;
  showOnboardingForm?: boolean;
  showOffboardingForm?: boolean;
  regularizationUpdate?: {
    id: string;
    status: LeaveStatus;
  };
}

// Define tools for the HR Assistant
const hrTools = [
  {
    functionDeclarations: [
      {
        name: "generatePayslip",
        description: "Generates and retrieves the salary slip (payslip) PDF for a specific month and year.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            month: { type: Type.STRING, description: "The month name (e.g. January, October)" },
            year: { type: Type.STRING, description: "The year (e.g. 2023)" }
          },
          required: ["month", "year"]
        }
      },
      {
        name: "openRegularizationForm",
        description: "Opens a UI form for the user to submit a regularization request (missing punch, incorrect punch, WFH).",
        parameters: { type: Type.OBJECT, properties: {} }
      },
      {
        name: "getMyRegularizationRequests",
        description: "Retrieves the history and status of regularization requests for the current user.",
        parameters: { type: Type.OBJECT, properties: {} }
      },
      {
        name: "getPendingApprovals",
        description: "Retrieves pending regularization requests that need approval. Only for Managers and HR.",
        parameters: { type: Type.OBJECT, properties: {} }
      },
      {
        name: "approveRejectRequest",
        description: "Approve or reject a specific regularization request.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            requestId: { type: Type.STRING },
            decision: { type: Type.STRING, enum: ["Approved", "Rejected"] }
          },
          required: ["requestId", "decision"]
        }
      },
      {
        name: "initiateOnboarding",
        description: "Opens the employee onboarding form to add a new hire. Use this when HR wants to add a new employee.",
        parameters: { type: Type.OBJECT, properties: {} }
      },
      {
        name: "initiateOffboarding",
        description: "Opens the employee offboarding form to remove or exit an employee. Use this when HR wants to process a resignation or termination.",
        parameters: { type: Type.OBJECT, properties: {} }
      }
    ]
  }
];

export const generateHRResponse = async (
  query: string, 
  context: string, 
  user: Employee, 
  currentRequests: RegularizationRequest[]
): Promise<HRResponse> => {
  try {
    const apiKey = process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });
    
    const model = 'gemini-2.5-flash';
    const systemInstruction = `You are an helpful HR Assistant for GRX10 Company. 
    Current User: ${user.name} (${user.role}).

    Use the provided context (Company Policies) to answer employee questions accurately.

    TOOL USAGE RULES:
    1. Payslips: If user asks for payslip/salary slip, use 'generatePayslip'.
    2. Regularization:
       - If user says "I missed a punch" or "apply for regularization", use 'openRegularizationForm'.
       - If user asks "status of my requests", use 'getMyRegularizationRequests'.
       - If Manager/HR asks "pending approvals" or "what requests do I need to approve", use 'getPendingApprovals'.
       - If Manager/HR says "Approve request REG..." or clicks an action button, use 'approveRejectRequest'.
    3. Employee Management (HR ONLY):
       - If HR/Admin says "onboard new employee" or "add new hire", use 'initiateOnboarding'.
       - If HR/Admin says "offboard employee", "employee resigned", or "remove employee", use 'initiateOffboarding'.

    Be professional and concise.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: `Context: ${context}\n\nQuestion: ${query}`,
      config: {
        systemInstruction: systemInstruction,
        tools: hrTools,
      }
    });

    // Check for function calls
    const functionCall = response.candidates?.[0]?.content?.parts?.find(p => p.functionCall)?.functionCall;

    if (functionCall) {
      const args = functionCall.args as any;

      if (functionCall.name === 'generatePayslip') {
        return {
          text: `I've generated your payslip for ${args.month} ${args.year}. You can download it directly below.`,
          payslip: {
            month: args.month,
            year: args.year,
            netPay: 85000 // Mock net pay amount
          }
        };
      }

      if (functionCall.name === 'openRegularizationForm') {
        return {
          text: "I can help with that. Please fill out the details in the form below to submit your request.",
          showRegularizationForm: true
        };
      }

      if (functionCall.name === 'getMyRegularizationRequests') {
        const myRequests = currentRequests.filter(r => r.employeeId === user.id);
        return {
          text: myRequests.length ? "Here are your recent regularization requests:" : "You have no regularization requests.",
          regularizationList: myRequests
        };
      }

      if (functionCall.name === 'getPendingApprovals') {
        if (user.role === Role.EMPLOYEE) {
          return { text: "Sorry, only Managers and HR can view pending approvals." };
        }

        // Filter logic mirrors Attendance page logic
        const pending = currentRequests.filter(r => {
          if (r.status !== LeaveStatus.PENDING) return false;
          if (user.role === Role.HR || user.role === Role.ADMIN) return true;
          if (user.role === Role.MANAGER) return r.employeeId !== user.id;
          return false;
        });

        return {
          text: pending.length ? "Here are the requests pending your approval:" : "No pending approvals found.",
          regularizationList: pending,
          isApprovalList: true
        };
      }

      if (functionCall.name === 'approveRejectRequest') {
        const status = args.decision === 'Approved' ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;
        return {
          text: `Request ${args.requestId} has been ${args.decision.toLowerCase()}.`,
          regularizationUpdate: {
            id: args.requestId,
            status: status
          }
        };
      }

      if (functionCall.name === 'initiateOnboarding') {
        if (user.role !== Role.HR && user.role !== Role.ADMIN) {
          return { text: "I'm sorry, only HR and Admins can onboard new employees." };
        }
        return {
          text: "Opening the Employee Onboarding Wizard for you.",
          showOnboardingForm: true
        };
      }

      if (functionCall.name === 'initiateOffboarding') {
        if (user.role !== Role.HR && user.role !== Role.ADMIN) {
          return { text: "I'm sorry, only HR and Admins can offboard employees." };
        }
        return {
          text: "Opening the Employee Offboarding form.",
          showOffboardingForm: true
        };
      }
    }

    return { text: response.text || "I'm sorry, I couldn't process that request right now." };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Sorry, the HR Assistant is temporarily unavailable." };
  }
};
