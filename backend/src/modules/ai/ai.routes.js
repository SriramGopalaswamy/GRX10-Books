import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sequelize } from '../../config/database.js';

const router = express.Router();

// Initialize Gemini (User will need to provide key in .env)
// For now, we'll check process.env inside the route to allow hot-reloading of env vars if needed
// or just fail gracefully.

router.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                role: 'model',
                text: 'Error: GEMINI_API_KEY is not set in the server environment.'
            });
        }

        // Simple RAG / Tool Use Simulation
        // 1. Fetch relevant context from DB (e.g. recent invoices, total revenue)
        // For a real "Expert" system, we would use function calling. 
        // Here we will do a "Context Injection" approach for simplicity and reliability first.

        const [results] = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM Invoices) as invoice_count,
        (SELECT SUM(total) FROM Invoices) as total_revenue,
        (SELECT COUNT(*) FROM Customers) as customer_count
    `);

        const context = `
      Current Financial Data:
      - Total Invoices: ${results[0].invoice_count}
      - Total Revenue: ${results[0].total_revenue || 0}
      - Total Customers: ${results[0].customer_count}
    `;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history: history || [],
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const prompt = `
      System Context: You are an expert financial assistant for Indian Accounting.
      ${context}
      
      User Question: ${message}
    `;

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ role: 'model', text });

    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ role: 'model', text: 'Sorry, I encountered an error processing your request.' });
    }
});

export default router;
