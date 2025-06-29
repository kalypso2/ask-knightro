// ingest_data.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { ChromaClient } = require('chromadb');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const PDF_PATH = path.join(__dirname, 'ucf_catalog.pdf');
const CHROMA_COLLECTION_NAME = 'ucf_catalog';
const CHROMA_DB_PATH = path.join(__dirname, "chroma_db"); // Path to store local DB files
// --- END CONFIGURATION ---

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// --- CORRECTED LINE ---
// We explicitly tell the client to save its data to a local folder.
// This puts it into "local" or "embedded" mode and prevents it from trying to connect to a server.
const chromaClient = new ChromaClient({ path: CHROMA_DB_PATH });
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

class GoogleAIEmbeddingFunction {
    async generate(texts) {
        const result = await embeddingModel.batchEmbedContents({
            requests: texts.map(text => ({ content: text, taskType: "RETRIEVAL_DOCUMENT" }))
        });
        return result.embeddings.map((e) => e.values);
    }
}

const embedder = new GoogleAIEmbeddingFunction();

// ... (The rest of this file remains exactly the same as before) ...
async function ingestPdf() {
    console.log(`Reading PDF from: ${PDF_PATH}`);
    if (!fs.existsSync(PDF_PATH)) {
        console.error('PDF file not found! Please download the UCF catalog and save it as ucf_catalog.pdf');
        return;
    }
    const dataBuffer = fs.readFileSync(PDF_PATH);
    const pdfData = await pdf(dataBuffer);
    console.log(`Successfully extracted ${pdfData.numpages} pages of text.`);
    const textChunks = chunkText(pdfData.text);
    console.log(`Text split into ${textChunks.length} chunks.`);
    console.log(`Initializing ChromaDB in local mode at: ${CHROMA_DB_PATH}`);
    const collection = await chromaClient.getOrCreateCollection({
        name: CHROMA_COLLECTION_NAME,
        embeddingFunction: embedder
    });
    console.log('Collection is ready.');
    console.log('Adding documents to the collection. This will now be handled by ChromaDB using our function.');
    console.log('This will still take several minutes...');
    const batchSize = 100;
    for (let i = 0; i < textChunks.length; i += batchSize) {
        const batch = textChunks.slice(i, i + batchSize);
        const ids = batch.map((_, index) => `chunk_${i + index}`);
        await collection.add({
            ids: ids,
            documents: batch
        });
        console.log(`  - Processed batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(textChunks.length / batchSize)}`);
    }
    console.log('\n🎉 Ingestion complete! Your vector knowledge base is ready.');
}

function chunkText(text) {
    const chunks = [];
    const chunkSize = 1000;
    const chunkOverlap = 200;
    for (let i = 0; i < text.length; i += (chunkSize - chunkOverlap)) {
        chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
}

ingestPdf();