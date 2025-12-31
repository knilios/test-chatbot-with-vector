# Simple Console Prototype - AI Memory with Vector Database

Build a simple Node.js console application that demonstrates the vector database memory flow.

## Goal
Create a minimal prototype showing:
1. Chat with conversation cache
2. Vector DB search for relevant memories
3. Periodic processing to create narrative chunks
4. Storing chunks in vector database

## Tech Stack
- **Node.js** (plain console application)
- **OpenAI API** (GPT-4o for chat, text-embedding-3-small for embeddings)
- **Chroma DB** (chromadb npm package)
- **dotenv** for configuration

## Flow to Demonstrate

### Chat Flow:
```
User Input 
  → Search Vector DB for relevant memories
  → Combine [memories + conversation_cache + input]
  → GPT-4o generates response
  → Add to conversation_cache
  → When cache reaches 7 items: summarize with GPT-3.5-turbo
```

### Memory Storage (manual trigger for demo):
```
Command: "process-memories"
  → Collect all summaries
  → Send to GPT-4o to create narrative chunks (pipe-separated)
  → Generate embeddings
  → Store in Chroma DB
  → Clear summaries
```

## Project Structure
```
prototype/
├── .env
├── package.json
├── index.js          # Main console app
├── vectorDB.js       # Chroma DB operations
└── memoryProcessor.js # Chunking logic
```

## Implementation Details

### 1. `index.js` - Main Application
```javascript
// Simple REPL loop:
// - Type message → get AI response
// - Type "memories" → show stored memories
// - Type "process" → trigger chunking and storage
// - Type "exit" → quit

const readline = require('readline');
const OpenAI = require('openai');
const { searchMemories, storeMemories } = require('./vectorDB');
const { processConversations } = require('./memoryProcessor');

const conversationCache = [];
const dailySummaries = [];
const CACHE_LIMIT = 7;

// Main chat loop
// When cache full → summarize and add to dailySummaries
// Before GPT call → search vector DB
// Display retrieved memories in console
```

### 2. `vectorDB.js`
```javascript
// Initialize Chroma client
// Collection name: "memories"

async function searchMemories(query, limit = 3) {
  // 1. Generate embedding for query using OpenAI
  // 2. Search Chroma collection
  // 3. Return top matches with narratives
}

async function storeMemories(chunks) {
  // chunks = [{narrative: "...", metadata: {...}}]
  // 1. Generate embeddings for each chunk
  // 2. Store in Chroma with metadata
}
```

### 3. `memoryProcessor.js`
```javascript
async function processConversations(summaries) {
  // 1. Combine all summaries into one text
  // 2. Send to GPT-4o with prompt:
  /*
     "Analyze these conversation summaries and create narrative chunks.
     Break into story beats separated by |
     
     Format: Event/action | Event/action | Event/action
     
     Example: User A asks about X | User B discusses Y | Topic shifts to Z
     
     Summaries:
     [summaries here]
  */
  // 3. Parse response into chunks
  // 4. Extract metadata (users mentioned, topics)
  // 5. Return array of chunk objects
}
```

## Console Commands
- Normal text → Chat with AI
- `memories` → Show all stored memory chunks
- `process` → Process summaries into chunks and store in vector DB
- `cache` → Show current conversation cache
- `summaries` → Show collected summaries
- `exit` → Quit

## Example Session
```
> Hello
[Searching memories...]
No relevant memories found.
AI: Hi! How can I help you?

> What did we talk about yesterday?
[Searching memories...]
Found memory: "User asked about code review | Discussion about best practices"
AI: We discussed code review and best practices!

> process
Processing 3 summaries...
Created 2 narrative chunks
Stored in vector database
Summaries cleared.

> memories
Memory 1: "User asked about code review | Discussion about best practices"
Memory 2: "User requested help with Node.js | Explanation of async/await provided"

> exit
```

## .env File
```
OPENAI_API_KEY=your_key_here
CHROMA_PATH=./chroma_data
```

## Key Requirements
1. **Simple console interface** - use readline for input
2. **Show what's happening** - log when searching memories, when summarizing, etc.
3. **Manual trigger** - use "process" command instead of scheduling
4. **Minimal code** - focus on demonstrating the flow, not production quality
5. **No Discord** - just plain console I/O
6. **No personality** - generic helpful AI responses

## Implementation Steps
1. Setup: npm init, install dependencies (openai, chromadb, dotenv)
2. Create basic REPL with readline
3. Implement simple chat with OpenAI
4. Add conversation_cache and summarization
5. Integrate Chroma DB for vector storage
6. Add memory search before each AI call
7. Implement manual "process" command for chunking
8. Test the full flow

Keep it simple - this is a proof of concept, not production code.
