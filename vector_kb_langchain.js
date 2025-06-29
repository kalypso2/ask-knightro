// vector_kb_langchain.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// --- CORRECTED IMPORTS FOR MODERN LANGCHAIN ---
const { HNSWLib } = require("@langchain/community/vectorstores/hnswlib");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
// --- END OF CORRECTION ---

const VECTOR_STORE_PATH = path.join(__dirname, 'ucf_catalog_vector_store');
let vectorStore;

async function searchVectorDB(query) {
    try {
        if (!vectorStore) {
            if (!fs.existsSync(VECTOR_STORE_PATH)) {
                console.error("Vector store file not found. Did you run 'node ingest_data_langchain.js' first?");
                return null;
            }
            console.log('Loading vector store from disk...');
            const embeddings = new GoogleGenerativeAIEmbeddings({
                apiKey: process.env.GEMINI_API_KEY,
                model: "text-embedding-004"
            });
            vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);
            console.log('Vector store loaded successfully.');
        }

        const results = await vectorStore.similaritySearch(query, 5);

        if (results && results.length > 0) {
            return results.map(doc => doc.pageContent).join('\n\n---\n\n');
        }
        return null;

    } catch (error) {
        console.error(`[Vector DB Search Error] ${error.message}`);
        return null;
    }
}

module.exports = { searchVectorDB };