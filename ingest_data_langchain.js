// ingest_data_langchain.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

// --- CORRECTED IMPORTS FOR MODERN LANGCHAIN ---
const { Document } = require("@langchain/core/documents");
const { HNSWLib } = require("@langchain/community/vectorstores/hnswlib");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
// --- END OF CORRECTION ---

const PDF_PATH = path.join(__dirname, 'ucf_catalog.pdf');
const VECTOR_STORE_PATH = path.join(__dirname, 'ucf_catalog_vector_store');

function chunkText(text) {
    const chunks = [];
    const chunkSize = 1000;
    const chunkOverlap = 200;
    for (let i = 0; i < text.length; i += (chunkSize - chunkOverlap)) {
        chunks.push(new Document({ pageContent: text.substring(i, i + chunkSize) }));
    }
    return chunks;
}

async function ingestPdf() {
    try {
        console.log(`Reading PDF from: ${PDF_PATH}`);
        if (!fs.existsSync(PDF_PATH)) {
            throw new Error('PDF file not found! Please download the UCF catalog and save it as ucf_catalog.pdf');
        }

        const dataBuffer = fs.readFileSync(PDF_PATH);
        const pdfData = await pdf(dataBuffer);
        console.log(`Successfully extracted ${pdfData.numpages} pages of text.`);

        const textChunks = chunkText(pdfData.text);
        console.log(`Text split into ${textChunks.length} document chunks.`);

        console.log('Initializing Google AI embedding model...');
        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GEMINI_API_KEY,
            model: "text-embedding-004"
        });

        console.log('Creating vector store from documents. This will take several minutes...');
        const vectorStore = await HNSWLib.fromDocuments(textChunks, embeddings);

        console.log(`Saving vector store to: ${VECTOR_STORE_PATH}`);
        await vectorStore.save(VECTOR_STORE_PATH);

        console.log('\n🎉 Ingestion complete! Your LangChain vector store is ready.');

    } catch (error) {
        console.error("An error occurred during ingestion:", error);
    }
}

ingestPdf();