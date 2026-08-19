import express, { Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// Sample Function for Function Calling
const weatherTool = {
    functionDeclarations: [{
        name: "get_weather",
        description: "Get current weather for a location",
        parameters: {
            type: "OBJECT",
            properties: {
                location: { type: "STRING", description: "City name" }
            },
            required: ["location"]
        }
    }]
};

app.post('/api/chat', async (req: Request, res: Response) => {
    try {
        const { 
            message, 
            history, 
            modelName, 
            thinkingLevel, 
            useSearch, 
            useCode, 
            temperature 
        } = req.body;

        // 1. Configure Tools
        const tools: any[] = [];
        if (useSearch) tools.push({ googleSearch: {} });
        if (useCode) tools.push({ codeExecution: {} });
        tools.push(weatherTool); // Always enable weather for demo

        // 2. Configuration following your standard
        const config = {
            thinkingConfig: {
                thinkingLevel: ThinkingLevel[thinkingLevel as keyof typeof ThinkingLevel] || ThinkingLevel.MEDIUM,
            },
            tools,
            generationConfig: {
                temperature: parseFloat(temperature) || 0.7,
            }
        };

        // 3. Format contents for the SDK
        const contents = [...history, {
            role: 'user',
            parts: [{ text: message }],
        }];

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const responseStream = await ai.models.generateContentStream({
            model: modelName,
            config,
            contents,
        });

        for await (const chunk of responseStream) {
            const part = chunk.candidates?.[0]?.content?.parts?.[0];
            if (!part) continue;

            let payload = { type: 'text', content: '' };

            if (part.text) {
                payload = { type: 'text', content: part.text };
            } else if (part.executableCode) {
                payload = { type: 'code', content: part.executableCode };
            } else if (part.codeExecutionResult) {
                payload = { type: 'result', content: part.codeExecutionResult };
            } else if (part.thought) { // Gemma 4 thought tokens
                payload = { type: 'thought', content: part.text };
            }

            res.write(`data: ${JSON.stringify(payload)}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error: any) {
        console.error(error);
        res.status(500).write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        res.end();
    }
});

const PORT = 7102;
app.listen(PORT, () => console.log(`Gemma 4 Studio running at http://localhost:${PORT}`));