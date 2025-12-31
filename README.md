# AI Memory with Vector Database - Console Prototype

A simple Node.js console application demonstrating AI memory using vector database for semantic search and conversation management.

## Features

- **Chat with AI**: Interactive console-based chat powered by GPT-4o
- **Vector Memory Search**: Automatically searches for relevant memories before each response
- **Conversation Summarization**: Automatically summarizes conversations when cache reaches limit
- **Memory Processing**: Converts summaries into narrative chunks stored in vector database
- **ChromaDB Integration**: Uses ChromaDB for semantic vector search

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start ChromaDB Server

ChromaDB requires a server to be running. Use Docker:

```bash
docker run -p 8000:8000 chromadb/chroma
```

**Alternative (without Docker):** Install and run ChromaDB locally:

```bash
pip install chromadb
chroma run --host localhost --port 8000
```

Leave this terminal running and open a new terminal for the next steps.

### 3. Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-actual-api-key-here
CHROMA_PATH=http://localhost:8000
```

### 4. Run the Application

```bash
npm start
```

## Usage

### Commands

- **Normal text** - Chat with AI (searches memories automatically)
- `memories` - Show all stored memory chunks from vector database
- `process` - Process collected summaries into narrative chunks and store them
- `cache` - Show current conversation cache (last 7 messages)
- `summaries` - Show collected summaries waiting to be processed
- `help` - Show available commands
- `exit` - Quit the application

### Example Session

```
> Hello
[Searching memories...]
No relevant memories found.

AI: Hi! How can I help you today?

> I'm working on a Node.js project
[Searching memories...]
No relevant memories found.

AI: That's great! What kind of Node.js project are you working on?

> cache
=== Conversation Cache ===
1. [user] Hello
2. [assistant] Hi! How can I help you today?
3. [user] I'm working on a Node.js project
4. [assistant] That's great! What kind of Node.js project are you working on?
Total: 4 messages

> process
Processing 1 summaries...
[MemoryProcessor] Created 2 narrative chunks
[VectorDB] Successfully stored 2 chunks
Stored in vector database
Summaries cleared.

> memories
=== Stored Memories ===

Memory 1:
  Narrative: User greets and asks for help
  Metadata: {...}

Memory 2:
  Narrative: User mentions working on Node.js project
  Metadata: {...}

Total: 2 memories
```

## How It Works

### Chat Flow

1. User enters message
2. System searches vector DB for relevant memories (top 3 matches)
3. Combines memories + conversation cache + user input
4. GPT-4o generates response
5. Adds exchange to conversation cache
6. When cache reaches 7 items, summarizes and resets

### Memory Processing

1. Type `process` command
2. All collected summaries are sent to GPT-4o
3. GPT-4o creates narrative chunks separated by `|`
4. Each chunk gets an embedding via text-embedding-3-small
5. Chunks are stored in ChromaDB with metadata
6. Summaries are cleared

## Architecture

### Files

- **index.js** - Main REPL application, handles user interaction
- **vectorDB.js** - ChromaDB operations (search, store, retrieve)
- **memoryProcessor.js** - Conversation summarization and chunking logic
- **package.json** - Dependencies and scripts
- **.env** - Configuration (API keys, paths)

### State Management

- `conversationCache` - Last 7 messages for context
- `dailySummaries` - Accumulated summaries waiting to be processed
- ChromaDB collection - Long-term memory storage

## Technologies

- **Node.js** - Runtime environment
- **OpenAI API** - GPT-4o for chat, text-embedding-3-small for embeddings
- **ChromaDB** - Vector database for semantic search
- **dotenv** - Environment configuration

## Notes

- This is a prototype for demonstration purposes
- Conversation cache limit is set to 7 messages
- Memory search returns top 3 most relevant results
- All summaries must be manually processed with `process` command
