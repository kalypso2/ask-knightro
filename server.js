// server.js

// Import necessary modules
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // For loading environment variables from .env file

// Import the Google Generative AI client library
const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000; // Use port from environment variable or default to 3000

// Middleware to parse JSON request bodies
app.use(express.json());

// Enable CORS for all origins (for development purposes)
// In production, you should restrict this to your specific frontend origin(s)
app.use(cors());

// Get your API key from environment variables
// IMPORTANT: Never hardcode your API key directly in your code.
const API_KEY = process.env.GEMINI_API_KEY;

// Check if API key is provided
if (!API_KEY) {
    console.error("Error: GEMINI_API_KEY is not set in your .env file.");
    process.exit(1); // Exit the process if the API key is missing
}

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(API_KEY);

// Define the model to use. Changed from "gemini-pro" to "gemini-2.0-flash" for wider availability.
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // <--- UPDATED MODEL HERE

// Add a simple GET route for the root URL to confirm the server is running
app.get('/', (req, res) => {
    res.send('Welcome to the Ask Knightro API! Use the /ask-knightro endpoint for chatbot interactions.');
});

// Define the API endpoint for the chatbot
app.post('/ask-knightro', async (req, res) => {
    const userQuestion = req.body.question;

    // Validate if a question was provided
    if (!userQuestion) {
        return res.status(400).json({ error: "Please provide a question." });
    }

    try {
        // Construct the prompt for the Gemini API
        // This prompt instructs the AI to act as Knightro and focus on UCF information.
        const prompt = `You are Knightro, the official mascot of the University of Central Florida (UCF). 
        Your purpose is to provide helpful, accurate, and friendly information specifically about UCF. 
        Focus solely on topics related to UCF, its history, academics, campus life, sports, traditions, etc. 
        If a question is not about UCF, politely state that you can only answer questions about UCF.

        User's question: "${userQuestion}"

        Knightro's answer:`;

        // Generate content using the Gemini model
        const result = await model.generateContent(prompt, {
            // Configure safety settings to block harmful content
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
            ],
        });

        // Extract the text response from the generated content
        const responseText = result.response.text();

        // Send the AI's response back to the client
        res.json({ answer: responseText });

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Send a more informative error message to the client
        res.status(500).json({ error: "Failed to get an answer from Knightro. Please try again later.", details: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Ask Knightro server running on http://localhost:${port}`);
    console.log(`API endpoint: http://localhost:${port}/ask-knightro`);
});



