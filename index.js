require('dotenv').config();
const readline = require('readline');
const OpenAI = require('openai');
const { searchMemories, storeMemories, getAllMemories, clearAllMemories } = require('./vectorDB');
const { processConversations, summarizeConversation } = require('./memoryProcessor');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// State management
const conversationCache = [];
let currentSummary = ''; // Single rolling summary that gets updated
const CACHE_LIMIT = 7;

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

/**
 * Display help information
 */
function showHelp() {
  console.log('\n=== Available Commands ===');
  console.log('  Normal text       - Chat with AI');
  console.log('  memories          - Show all stored memory chunks');
  console.log('  process           - Process summaries into chunks and store in vector DB');
  console.log('  cache             - Show current conversation cache');
  console.log('  summaries         - Show collected summaries');
  console.log('  clear             - Clear all memories from vector database');
  console.log('  help              - Show this help message');
  console.log('  exit              - Quit the application');
  console.log('==========================\n');
}

/**
 * Show current conversation cache
 */
function showCache() {
  console.log('\n=== Conversation Cache ===');
  if (conversationCache.length === 0) {
    console.log('Cache is empty');
  } else {
    conversationCache.forEach((msg, idx) => {
      console.log(`${idx + 1}. [${msg.role}] ${msg.content}`);
    });
  }
  console.log(`Total: ${conversationCache.length} messages\n`);
}

/**
 * Show current summary
 */
function showSummaries() {
  console.log('\n=== Current Summary ===');
  if (!currentSummary) {
    console.log('No summary yet');
  } else {
    console.log(currentSummary);
  }
  console.log('\n');
}

/**
 * Show all stored memories
 */
async function showMemories() {
  console.log('\n=== Stored Memories ===');
  const memories = await getAllMemories();
  
  if (memories.length === 0) {
    console.log('No memories stored yet');
  } else {
    memories.forEach((memory, idx) => {
      console.log(`\nMemory ${idx + 1}:`);
      console.log(`  Narrative: ${memory.narrative}`);
      if (memory.metadata && Object.keys(memory.metadata).length > 0) {
        console.log(`  Metadata: ${JSON.stringify(memory.metadata, null, 2)}`);
      }
    });
  }
  console.log(`\nTotal: ${memories.length} memories\n`);
}

/**
 * Process summary and residual cache into vector database
 */
async function processSummaries() {
  if (!currentSummary && conversationCache.length === 0) {
    console.log('\nNo conversation to process\n');
    return;
  }

  try {
    // Build the full context to process
    const contextsToProcess = [];
    
    if (currentSummary) {
      contextsToProcess.push(currentSummary);
    }
    
    // If there's residual conversation in cache, summarize it first
    if (conversationCache.length > 1) { // More than just the summary context
      console.log('\n[Processing residual conversation...]');
      const residualSummary = await summarizeConversation(conversationCache);
      contextsToProcess.push(residualSummary);
    }
    
    if (contextsToProcess.length === 0) {
      console.log('\nNo content to process\n');
      return;
    }
    
    console.log(`\nProcessing conversation context...`);
    
    // Process into narrative chunks
    const chunks = await processConversations(contextsToProcess);
    
    if (chunks.length > 0) {
      // Store chunks in vector database
      await storeMemories(chunks);
      
      console.log(`Created ${chunks.length} narrative chunks`);
      console.log('Stored in vector database');
      
      // Clear summary and cache after processing
      currentSummary = '';
      conversationCache.length = 0;
      console.log('Summary and cache cleared.\n');
    } else {
      console.log('No chunks created\n');
    }
  } catch (error) {
    console.error('Error processing summaries:', error.message);
  }
}

/**
 * Reformulate user input into better search query
 */
async function reformulateQuery(input, recentContext = []) {
  try {
    // Build context from recent conversation
    const contextStr = recentContext
      .slice(-4) // Last 2 exchanges
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    
    const prompt = `Given this user input and recent conversation context, generate a concise search query to find relevant memories.

Recent context:
${contextStr || 'No recent context'}

User input: "${input}"

Generate a search query that captures:
- What the user is asking about
- Key entities, topics, or concepts
- Implicit references from context

Output ONLY the search query, nothing else. Keep it under 20 words.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use cheaper model for this
      messages: [
        {
          role: 'system',
          content: 'You are a search query optimizer. Convert user messages into effective search queries for finding relevant memories. Output only the query.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    });

    const searchQuery = response.choices[0].message.content.trim();
    return searchQuery;
  } catch (error) {
    console.error('[Query Reformulation] Error:', error.message);
    // Fallback to original input
    return input;
  }
}

/**
 * Handle AI chat interaction
 */
async function handleChat(input) {
  try {
    // Reformulate query for better memory search
    const searchQuery = await reformulateQuery(input, conversationCache);
    
    if (searchQuery !== input) {
      console.log(`[Reformulated query: "${searchQuery}"]`);
    }
    console.log('[Searching memories...]');
    
    // Search vector database for relevant memories
    const relevantMemories = await searchMemories(searchQuery, 3);
    
    if (relevantMemories.length > 0) {
      console.log(`Found ${relevantMemories.length} relevant memories:`);
      relevantMemories.forEach((memory, idx) => {
        console.log(`  ${idx + 1}. ${memory.narrative}`);
      });
    } else {
      console.log('No relevant memories found.');
    }
    
    // Build messages array
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Keep your responses concise and friendly.'
      }
    ];
    
    // Add relevant memories as context
    if (relevantMemories.length > 0) {
      const memoryContext = relevantMemories
        .map(m => m.narrative)
        .join(' | ');
      messages.push({
        role: 'system',
        content: `Relevant memories from past conversations: ${memoryContext}`
      });
    }
    
    // Add conversation cache
    messages.push(...conversationCache);
    
    // Add current user input
    messages.push({
      role: 'user',
      content: input
    });
    
    // Get AI response
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7
    });
    
    const reply = response.choices[0].message.content;
    console.log(`\nAI: ${reply}\n`);
    
    // Update conversation cache
    conversationCache.push(
      { role: 'user', content: input },
      { role: 'assistant', content: reply }
    );
    
    // Check if cache needs summarization
    if (conversationCache.length >= CACHE_LIMIT) {
      console.log('[Cache limit reached, summarizing conversation...]');
      
      const newSummary = await summarizeConversation(conversationCache);
      
      // Update the rolling summary (merge with previous if exists)
      if (currentSummary) {
        currentSummary = `${currentSummary}\n\n${newSummary}`;
      } else {
        currentSummary = newSummary;
      }
      
      // Reset cache with combined summary as context
      conversationCache.length = 0;
      conversationCache.push({
        role: 'user',
        content: `Previous conversation context: ${currentSummary}`
      });
      
      console.log('[Conversation summarized and cache reset]\n');
    }
    
  } catch (error) {
    console.error('Error in chat:', error.message);
    if (error.status === 401) {
      console.error('Authentication failed. Please check your OPENAI_API_KEY in .env file');
    } else if (error.status === 429) {
      console.error('Rate limit exceeded. Please try again later.');
    }
  }
}

/**
 * Process user input
 */
async function processInput(input) {
  const trimmedInput = input.trim();
  
  if (!trimmedInput) {
    rl.prompt();
    return;
  }
  
  // Handle commands
  switch (trimmedInput.toLowerCase()) {
    case 'exit':
    case 'quit':
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
      break;
      
    case 'help':
      showHelp();
      rl.prompt();
      break;
      
    case 'cache':
      showCache();
      rl.prompt();
      break;
      
    case 'summaries':
      showSummaries();
      rl.prompt();
      break;
      
    case 'memories':
      await showMemories();
      rl.prompt();
      break;
      
    case 'process':
      await processSummaries();
      rl.prompt();
      break;
      
    case 'clear':
      console.log('\n⚠️  This will delete ALL memories from the vector database.');
      console.log('Type "confirm" to proceed or anything else to cancel:');
      rl.question('', async (confirmation) => {
        if (confirmation.trim().toLowerCase() === 'confirm') {
          const deleted = await clearAllMemories();
          console.log(`\n✓ Database cleared. ${deleted} memories deleted.\n`);
        } else {
          console.log('\nCancelled. No memories were deleted.\n');
        }
        rl.prompt();
      });
      return; // Don't prompt twice
      
    default:
      // Regular chat input
      await handleChat(trimmedInput);
      rl.prompt();
      break;
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log('\n====================================');
  console.log('  AI Memory with Vector Database');
  console.log('====================================\n');
  
  // Check for API key
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_key_here') {
    console.error('Error: OPENAI_API_KEY not configured');
    console.error('Please create a .env file with your OpenAI API key');
    console.error('See .env.example for reference\n');
    process.exit(1);
  }
  
  console.log('Type "help" for available commands\n');
  
  rl.prompt();
  
  rl.on('line', async (line) => {
    await processInput(line);
  });
  
  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error.message);
});

// Start the application
main();
