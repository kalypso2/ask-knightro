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

// Define the model to use (gemini-2.0-flash for wider availability)
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Add a simple GET route for the root URL to confirm the server is running
app.get('/', (req, res) => {
    res.send('Welcome to the Ask Knightro API! Use the /ask-knightro endpoint for chatbot interactions.');
});

// Define the API endpoint for the chatbot
app.post('/ask-knightro', async (req, res) => {
    const userQuestion = req.body.question;
    // Receive the chat history from the frontend
    const chatHistory = req.body.chatHistory || [];

    // Validate if a question was provided
    if (!userQuestion) {
        return res.status(400).json({ error: "Please provide a question." });
    }

    try {
        // Construct the full conversation content for the Gemini API
        // This includes the system instruction (persona) and the chat history.
        const contents = [
            {
                role: "user",
                parts: [{
                    text: `You are Knightro, the official mascot of the University of Central Florida (UCF). 
                                Your purpose is to provide helpful, accurate, and friendly information about UCF. 
                                For questions tangentially related to UCF, such as local amenities, nearby services, or general student life advice, 
                                you can provide helpful, general information or typical recommendations relevant to a university environment. 
                                Avoid giving highly subjective opinions or exhaustive lists, and always maintain your Knightro persona.
                                If a question is entirely unrelated to UCF or its surrounding area, politely state that you can only answer questions about UCF.
                                Respond concisely and informatively.

                                Examples:
                                User: What is the mascot of UCF?
                                Knightro: The official mascot of the University of Central Florida (UCF) is **Knightro**! Charge On!
                                User: Where is UCF located?
                                Knightro: UCF's main campus is located in **Orlando, Florida**, specifically in Alafaya, just northeast of downtown Orlando.
                                User: What's a good restaurant near UCF?
                                Knightro: There are many great dining options around UCF! You might find popular spots along University Boulevard or in nearby plazas. For a quick bite, many students enjoy places like [mention a generic type, e.g., "pizza places" or "fast casual restaurants"].
                                ` }]
            },
            {
                role: "model",
                parts: [{ text: "Hello! As Knightro, I'm here to help with any questions you have about UCF. Go Knights!" }]
            },
            // Append previous chat history to maintain context
            ...chatHistory
        ];

        // Ensure the last role in contents is 'user' before sending the new question
        // The Gemini API expects alternating user/model roles in chat history.
        // This logic handles potential misalignments from initial setup or prior conversation.
        if (contents.length > 0 && contents[contents.length - 1].role !== 'user') {
            // If the last message in history is not from the user, add the current user question.
            contents.push({ role: 'user', parts: [{ text: userQuestion }] });
        } else if (contents.length === 0) {
            // If history is empty, just add the user question.
            contents.push({ role: 'user', parts: [{ text: userQuestion }] });
        } else {
            // If the last message is from the user, check if it's the *same* question being re-sent.
            // If not, add the new user question. This prevents duplicating the last question if the frontend
            // sends the whole history including the new question.
            const lastMessageText = contents[contents.length - 1].parts[0].text;
            if (lastMessageText !== userQuestion) {
                contents.push({ role: 'user', parts: [{ text: userQuestion }] });
            }
        }


        // Generate content using the Gemini model
        const result = await model.generateContent({
            contents: contents // Pass the full conversation history
        }, {
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
        console.error("Error details:", error.message, error.stack); // More detailed logging
        // Send a more informative error message to the client
        res.status(500).json({ error: "Failed to get an answer from Knightro. Please try again later.", details: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Ask Knightro server running on http://localhost:${port}`);
    console.log(`API endpoint: http://localhost:${port}/ask-knightro`);
});



