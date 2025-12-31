require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Process conversation summaries into narrative chunks
 * @param {Array<string>} summaries - Array of conversation summaries
 * @returns {Promise<Array>} - Array of chunk objects with narrative and metadata
 */
async function processConversations(summaries) {
  try {
    if (!summaries || summaries.length === 0) {
      console.log('[MemoryProcessor] No summaries to process');
      return [];
    }

    console.log(`[MemoryProcessor] Processing ${summaries.length} summaries...`);

    // Combine all summaries into one text
    const combinedSummaries = summaries.map((s, idx) => `Summary ${idx + 1}:\n${s}`).join('\n\n');

    // Create prompt for GPT-4o
    const prompt = `Extract important facts and information from these conversation summaries. Think like long-term human memory - what would someone remember weeks later?

CRITICAL RULES:
1. Each chunk must be SELF-CONTAINED and make sense on its own
2. Focus on FACTS and ATTRIBUTES, not conversation flow
3. Extract WHO, WHAT, WHERE, WHEN - not "discussed" or "shifted to"
4. Combine related information into one chunk
5. Keep chunks 2-4 sentences, focused on one topic
6. Separate unrelated topics with | character

What to extract:
- Personal information (name, job, location, preferences, goals)
- Specific facts and details (numbers, dates, names)
- Skills, knowledge, or capabilities demonstrated
- Preferences, likes/dislikes, constraints
- Plans, goals, or future intentions

BAD (conversation flow): "User asked about Roman history. Conversation shifted to programming."
GOOD (facts only): "User is interested in Python and web development."

BAD (fragmented): "User moved to Tokyo. | User speaks Portuguese. | User misses Brazilian food."
GOOD (self-contained): "User is Brazilian (speaks Portuguese), recently moved to Tokyo for work, and is looking for Brazilian food there while learning Japanese."

BAD (too detailed): "Assistant asked about first emperor of Rome, user correctly answered Augustus, demonstrating knowledge of Roman history."
GOOD (high-level): "User has knowledge of Roman history."

BAD (incomplete context): "They miss Brazilian food and want to find it in Tokyo."
GOOD (complete context): "User recently moved to Tokyo and misses Brazilian food from home."

Summaries:
${combinedSummaries}

Extract the key facts as self-contained chunks, separated by |.`;

    // Get AI response
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a long-term memory system. Extract and consolidate important facts from conversations. Each memory chunk should be self-contained (readable independently), focus on facts not conversation flow, and capture what someone would remember long-term. Combine related information. Output only memory chunks separated by |.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500
    });

    const narrativeText = response.choices[0].message.content.trim();
    console.log('[MemoryProcessor] Generated narratives:', narrativeText);

    // Parse response into chunks
    const chunkTexts = narrativeText
      .split('|')
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length > 0)
      .filter(chunk => {
        // Remove chunks that are too short or too long
        const wordCount = chunk.split(/\s+/).length;
        return wordCount >= 10 && wordCount <= 200;
      });

    // Create chunk objects with metadata
    const chunks = chunkTexts.map(narrative => {
      // Extract basic metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        source: 'conversation_summary',
        chunk_length: narrative.length
      };

      // Try to extract topics/keywords (simple approach)
      const words = narrative.toLowerCase().split(/\s+/);
      const topics = words.filter(word => word.length > 5).slice(0, 3);
      if (topics.length > 0) {
        metadata.topics = topics.join(', ');
      }

      return {
        narrative,
        metadata
      };
    });

    console.log(`[MemoryProcessor] Created ${chunks.length} narrative chunks`);

    return chunks;
  } catch (error) {
    console.error('[MemoryProcessor] Error processing conversations:', error.message);
    throw error;
  }
}

/**
 * Summarize conversation cache
 * @param {Array} conversationCache - Array of message objects
 * @returns {Promise<string>} - Summary of the conversation
 */
async function summarizeConversation(conversationCache) {
  try {
    // Build conversation text
    let conversationText = "";
    for (let msg of conversationCache) {
      conversationText += msg.content + "\n";
    }
    conversationText += "\nsummary:";

    console.log('[MemoryProcessor] Summarizing conversation...');

    // Create summary using GPT-4o
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Summarize all the context in this following chat conversation concisely.'
        },
        {
          role: 'user',
          content: conversationText
        }
      ],
      temperature: 0.12,
      max_tokens: 1000
    });

    const summary = response.choices[0].message.content;
    console.log('[MemoryProcessor] Conversation summarized:', summary);

    return summary;
  } catch (error) {
    console.error('[MemoryProcessor] Error summarizing conversation:', error.message);
    throw error;
  }
}

module.exports = {
  processConversations,
  summarizeConversation,
};
