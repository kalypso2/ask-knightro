// server.js (With Conditional Query Augmentation)
require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const { searchVectorDB } = require('./vector_kb_langchain.js');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const GREETINGS = ['hello', 'hi', 'hey', 'yo', 'sup', 'howdy', 'greetings', 'hello?'];

app.post('/ask-knightro', async (req, res) => {
    const userQuestion = req.body.question;
    const lowerCaseQuestion = userQuestion.toLowerCase().trim();

    console.log(`\n-----------------------------------`);
    console.log(`[Server] Received query: "${userQuestion}"`);

    if (!userQuestion) {
        return res.status(400).json({ error: 'Question is required.' });
    }

    try {
        let prompt;

        // Tier 0: Greeting Check
        if (GREETINGS.includes(lowerCaseQuestion)) {
            console.log('[Server] ✅ Greeting HIT: Responding directly.');
            return res.json({ answer: "Hey there! I'm Ask Knightro, your friendly UCF chatbot. What can I help you with today? Go Knights!" });
        }

        // --- CONDITIONAL QUERY AUGMENTATION ---
        let searchQuery = userQuestion; // Default to the original user question

        // List of keywords to identify an academic-related query
        const academicKeywords = ['major', 'minor', 'classes', 'degree', 'program', 'curriculum', 'classes for', 'courses for', 'computer science', 'engineering', 'nursing', 'business', 'psychology', 'academics'];

        // Check if the user's question contains any of the keywords
        const isAcademicQuery = academicKeywords.some(keyword => lowerCaseQuestion.includes(keyword));

        if (isAcademicQuery) {
            // If it's an academic query, create a more detailed search query
            searchQuery = `Official curriculum, required courses, and degree requirements for a UCF academic program. User question: ${userQuestion}`;
            console.log(`[Server] Academic query detected. Augmented search query: "${searchQuery}"`);
        } else {
            // Otherwise, use the original, simple query
            console.log(`[Server] Non-academic query detected. Using direct search.`);
        }
        // --- END OF CONDITIONAL LOGIC ---

        // Tier 3: Vector Database Search using our new, smarter searchQuery
        const vectorContext = await searchVectorDB(searchQuery);

        if (vectorContext) {
            console.log(`[Server] ✅ PDF HIT: Found relevant context.`);
            prompt = `
                You are Ask Knightro, a helpful and knowledgeable UCF expert... [Use the helpful, non-negative RAG prompt] ...
                **Internal Knowledge:** --- ${vectorContext} --- **User's Question:** "${userQuestion}"
            `;
        } else {
            // Tier 4: General AI Fallback
            console.log(`[Server] INFO: No context found in PDF. Using general knowledge AI.`);
            prompt = `You are Ask Knightro, a helpful and friendly UCF chatbot... [General AI Prompt] ...`;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return res.json({ answer: response.text() });

    } catch (error) {
        console.error("[Server] Error processing request:", error);
        res.status(500).json({ error: 'Failed to get a response.' });
    }
});

app.listen(port, () => {
    console.log(`\nKnightro is listening. Access your app at: http://localhost:${3000}`);
});