/**
 * Test the AI chunking process (processConversations)
 * This WILL use OpenAI API - but only for chunking, not chat
 */

require('dotenv').config();
const { processConversations } = require('./memoryProcessor');

// Sample summary to test with
// This simulates the rolling summary after multiple conversation cycles
const testSummary = `User asked about the Roman Empire and wanted to learn more about ancient history. The assistant initiated a trivia quiz, starting with a question about the first emperor of Rome. The user correctly answered 'Augustus', demonstrating knowledge of Roman history. The assistant congratulated them and offered to continue with more questions. However, the user decided to shift topics and asked about learning programming instead, specifically mentioning interest in Python and web development.

User requested help understanding Node.js async/await functionality. The assistant provided a detailed explanation with code examples showing how async functions work and how the await keyword pauses execution. The user asked follow-up questions about error handling in async code. The assistant demonstrated try-catch blocks with practical examples and explained how to handle rejected promises. The conversation also covered the difference between callbacks, promises, and async/await patterns.

The conversation began with the user playing a geography quiz. Questions covered various topics including continents (user correctly identified Asia as largest), rivers (discussion about Nile vs Amazon), and mountains (Everest question). The user performed well overall, getting most answers correct. An interesting debate emerged about river measurements and how different sources measure river length differently. After several questions, the user grew tired of geography and wanted to discuss their favorite movies instead, particularly sci-fi films.

User introduced themselves as Sarah, a software engineer from Seattle. She mentioned she's been coding for 5 years and currently works at a startup building fintech applications. Sarah shared that she has two cats named Luna and Felix. She expressed interest in learning machine learning because she wants to transition into AI engineering within the next year.

User revealed they're vegetarian and have been for 3 years. They asked for recipe recommendations and mentioned they especially love Thai and Indian cuisine. The user also shared that they're allergic to peanuts, so they need to be careful with Asian recipes. They're trying to meal prep more to save time during the workweek since they work long hours as a nurse.

User mentioned they just moved to Tokyo last month for a new job. They're struggling with the language barrier and asked for tips on learning Japanese. The user shared that they grew up in Brazil, speak Portuguese natively, and learned English in school. They're finding Japanese particularly challenging because of the writing systems. User also mentioned they miss Brazilian food and asked where to find it in Tokyo.

The conversation started with user asking about fitness routines. User disclosed they're training for their first marathon scheduled for June. They mentioned they've been running for 6 months and currently run 20 miles per week. User also shared they had a knee injury 2 years ago and need to be careful about overtraining. They asked for advice on preventing injuries and building endurance safely.

User shared exciting news that they're getting married next spring. They asked for help planning a destination wedding in Greece. User mentioned their fiancé loves Greek mythology and history. The user revealed they have a budget of $30,000 and are inviting about 80 guests. They're particularly interested in venues on Santorini and asked about the best time of year to avoid crowds.`;

async function testChunking() {
  console.log('🧪 Testing AI Chunking Process\n');
  console.log('=' .repeat(70));
  console.log('\n📝 Input Summary (Rolling summary from multiple conversations):\n');
  
  console.log(testSummary);
  console.log('\n' + '=' .repeat(70));
  console.log(`\nSummary stats: ${testSummary.length} chars / ~${testSummary.split(/\s+/).length} words`);
  console.log('=' .repeat(70));
  console.log('\n🤖 Processing with GPT-4o...\n');
  
  try {
    const chunks = await processConversations([testSummary]);
    
    console.log('\n' + '=' .repeat(70));
    console.log(`\n✅ Generated ${chunks.length} chunks:\n`);
    
    chunks.forEach((chunk, idx) => {
      console.log(`\n📦 Chunk ${idx + 1}:`);
      console.log(`   Narrative: ${chunk.narrative}`);
      console.log(`   Length: ${chunk.narrative.length} chars / ~${Math.ceil(chunk.narrative.split(/\s+/).length)} words`);
      console.log(`   Metadata:`, JSON.stringify(chunk.metadata, null, 2));
    });
    
    // Analysis
    console.log('\n' + '=' .repeat(70));
    console.log('\n📊 Analysis:\n');
    console.log(`   Total chunks: ${chunks.length}`);
    console.log(`   Average length: ${Math.round(chunks.reduce((sum, c) => sum + c.narrative.length, 0) / chunks.length)} chars`);
    console.log(`   Shortest: ${Math.min(...chunks.map(c => c.narrative.length))} chars`);
    console.log(`   Longest: ${Math.max(...chunks.map(c => c.narrative.length))} chars`);
    
    const wordCounts = chunks.map(c => c.narrative.split(/\s+/).length);
    console.log(`\n   Word counts: ${wordCounts.join(', ')}`);
    
    console.log('\n💡 Tip: Edit the testSummaries array above to test different inputs\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.status === 401) {
      console.error('\n⚠️  Check your OPENAI_API_KEY in .env file');
    }
    process.exit(1);
  }
}

// Check for API key
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_key_here') {
  console.error('❌ Error: OPENAI_API_KEY not configured');
  console.error('Please create a .env file with your OpenAI API key\n');
  process.exit(1);
}

console.log('🚀 AI Chunking Test\n');
console.log('📌 This will use OpenAI API (GPT-4o)');
console.log('📌 Cost: ~$0.01 per run\n');

testChunking().then(() => {
  console.log('Test completed!\n');
  process.exit(0);
});
