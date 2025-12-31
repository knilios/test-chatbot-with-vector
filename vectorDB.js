require('dotenv').config();
const { ChromaClient } = require('chromadb');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let client = null;
let collection = null;

/**
 * Initialize Chroma DB client and collection
 */
async function initializeChroma() {
  if (!client) {
    // Initialize ChromaClient - connects to local ChromaDB server
    // Default: http://localhost:8000
    const chromaPath = process.env.CHROMA_PATH || 'http://localhost:8000';
    client = new ChromaClient({
      path: chromaPath
    });
    
    try {
      // Try to get existing collection or create new one
      collection = await client.getOrCreateCollection({
        name: 'memories',
        metadata: { description: 'AI conversation memory chunks' }
      });
      console.log('[VectorDB] Chroma initialized successfully');
    } catch (error) {
      console.error('[VectorDB] Error initializing Chroma:', error.message);
      console.error('[VectorDB] Make sure ChromaDB server is running on', chromaPath);
      console.error('[VectorDB] Run: docker run -p 8000:8000 chromadb/chroma');
      throw error;
    }
  }
  
  return collection;
}

/**
 * Generate embedding for a text using OpenAI
 * @param {string} text - Text to generate embedding for
 * @returns {Promise<number[]>} - Embedding vector
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('[VectorDB] Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Search for relevant memories in vector database
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of matching memories
 */
async function searchMemories(query, limit = 3) {
  try {
    await initializeChroma();
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search the collection
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
    });
    
    // Format results
    if (results.documents && results.documents[0] && results.documents[0].length > 0) {
      return results.documents[0].map((doc, idx) => ({
        narrative: doc,
        metadata: results.metadatas[0][idx] || {},
        distance: results.distances[0][idx]
      }));
    }
    
    return [];
  } catch (error) {
    console.error('[VectorDB] Error searching memories:', error.message);
    return [];
  }
}

/**
 * Store memory chunks in vector database
 * @param {Array} chunks - Array of chunk objects {narrative, metadata}
 * @returns {Promise<void>}
 */
async function storeMemories(chunks) {
  try {
    await initializeChroma();
    
    if (!chunks || chunks.length === 0) {
      console.log('[VectorDB] No chunks to store');
      return;
    }
    
    console.log(`[VectorDB] Generating embeddings for ${chunks.length} chunks...`);
    
    // Generate embeddings for all chunks
    const embeddings = [];
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.narrative);
      embeddings.push(embedding);
    }
    
    // Prepare data for storage
    const ids = chunks.map((_, idx) => `chunk_${Date.now()}_${idx}`);
    const documents = chunks.map(chunk => chunk.narrative);
    const metadatas = chunks.map(chunk => chunk.metadata || {});
    
    // Add to collection
    await collection.add({
      ids,
      embeddings,
      documents,
      metadatas,
    });
    
    console.log(`[VectorDB] Successfully stored ${chunks.length} chunks`);
  } catch (error) {
    console.error('[VectorDB] Error storing memories:', error.message);
    throw error;
  }
}

/**
 * Get all stored memories
 * @returns {Promise<Array>} - Array of all memories
 */
async function getAllMemories() {
  try {
    await initializeChroma();
    
    const count = await collection.count();
    
    if (count === 0) {
      return [];
    }
    
    const results = await collection.get({
      limit: count
    });
    
    if (results.documents && results.documents.length > 0) {
      return results.documents.map((doc, idx) => ({
        id: results.ids[idx],
        narrative: doc,
        metadata: results.metadatas[idx] || {}
      }));
    }
    
    return [];
  } catch (error) {
    console.error('[VectorDB] Error getting all memories:', error.message);
    return [];
  }
}

/**
 * Clear all memories from the database
 * @returns {Promise<number>} - Number of memories deleted
 */
async function clearAllMemories() {
  try {
    await initializeChroma();
    
    const count = await collection.count();
    
    if (count === 0) {
      console.log('[VectorDB] No memories to clear');
      return 0;
    }
    
    // Get all IDs
    const results = await collection.get();
    
    if (results.ids && results.ids.length > 0) {
      // Delete all documents
      await collection.delete({
        ids: results.ids
      });
      
      console.log(`[VectorDB] Cleared ${count} memories from database`);
      return count;
    }
    
    return 0;
  } catch (error) {
    console.error('[VectorDB] Error clearing memories:', error.message);
    throw error;
  }
}

module.exports = {
  initializeChroma,
  searchMemories,
  storeMemories,
  getAllMemories,
  clearAllMemories,
};
