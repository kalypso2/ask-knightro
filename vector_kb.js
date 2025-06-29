// vector_kb.js
require('dotenv').config();
const path = require('path');
const { ChromaClient } = require('chromadb');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const CHROMA_COLLECTION_NAME = 'ucf_catalog';
const CHROMA_DB_PATH = path.join(__dirname, "chroma_db");
// --- CORRECTED LINE ---
const chromaClient = new ChromaClient({ path: CHROMA_DB_PATH });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
let collection;

class GoogleAIQueryEmbeddingFunction {
    async generate(texts) {
        const result = await embeddingModel.batchEmbedContents({
            requests: texts.map(text => ({ content: text, taskType: "RETRIEVAL_QUERY" }))
        });
        return result.embeddings.map((e) => e.values);
    }
}

const embedder = new GoogleAIQueryEmbeddingFunction();


async function searchVectorDB(query) {
    try {
        if (!collection) {
            collection = await chromaClient.getCollection({
                name: CHROMA_COLLECTION_NAME,
                embeddingFunction: embedder
            });
        }
        const results = await collection.query({
            queryTexts: [query],
            nResults: 5
        });

        if (results.documents && results.documents.length > 0 && results.documents[0].length > 0) {
            return results.documents[0].join('\n\n---\n\n');
        }
        return null;

    } catch (error) {
        console.error(`[Vector DB Search Error] ${error.message}`);
        if (error.message.includes("does not exist")) {
            console.error("Did you run the 'node ingest_data.js' script first?");
        }
        return null;
    }
}

module.exports = { searchVectorDB };