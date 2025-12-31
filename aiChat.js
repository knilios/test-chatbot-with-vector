const OpenAI = require('openai');
const config = require('../config/config');
const logger = require('../utils/logger');

const conversation_cut_length = 7;
let openai = null;
let conversation_cache = [];

/**
 * Initialize OpenAI client
 */
function initializeOpenAI() {
  if (!config.openai.apiKey) {
    logger.warn('OpenAI API key not configured');
    return null;
  }

  if (!openai) {
    openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    logger.success('OpenAI initialized successfully');
  }

  return openai;
}

/**
 * Handle AI chat interaction
 * @param {Message} message - Discord message object
 * @param {Client} client - Discord client
 */
async function handleAIChat(message, client) {
  const ai = initializeOpenAI();
  
  if (!ai) {
    return message.channel.send('AI chat is not configured. Please set up your OpenAI API key.');
  }

  try {
    // Remove mention from message content
    let input = message.content.replace(/<@!?\d+>/g, '').trim();
    
    if (!input || input === "") {
      return message.channel.send('say something!!!!!');
    }

    // Show typing indicator
    message.channel.startTyping();

    logger.info("Sending stuffs to OpenAI");

    // Build the messages array
    const current_game = client.currentActivity || 'games';
    const messages = [
      {
        "role": "system",
        "content": `Pretend that you are Nattochan, a female Japanese anime style Discord chatbot which its sole purpose is to be useless and rage-baiting.Nattochan loves to tease everyone she talks to.Nattochan hates Knilios for no reason.Nattochan's creator is Knilios.Nattochan likes to play games.Now she's playing ${current_game}.**Only Generate Nattochan's speech**.Don't write a lot of text since it's discord.`
      },
    ];

    const date = new Date();
    let new_message = messages.concat(conversation_cache);
    new_message.push({
      "role": "user",
      "content": `(${date.toLocaleString("th-TH", { timezone: "Indochina/Bangkok" })})${message.author.username}:${input}`
    });

    logger.debug("Messages to send:", new_message);

    // Get AI response
    const response = await ai.chat.completions.create({
      model: "gpt-4o",
      messages: new_message,
      max_tokens: 1002
    });

    logger.info("User:", message.author.username);
    const reply = response.choices[0].message.content;
    const splited_reply = reply.split(/\r?\n/g);
    
    logger.info("Response:", reply);
    logger.debug("Split reply:", splited_reply);

    // Stop typing and send response
    message.channel.stopTyping();
    
    // Send each line of the response
    for (let i of splited_reply) {
      if (i != '') {
        if (i.match(/(?<=Nattochan:).*/g)) {
            const toSend = i.match(/(?<=Nattochan:).*/g)[0].trim();
            if (toSend != '') await message.channel.send(i.match(/(?<=Nattochan:).*/g)[0].trim());
        } else {
          await message.channel.send(i);
        }
      }
    }
    
    // Update conversation cache
    conversation_cache.push(
      { "role": "user", "content": message.author.username + ":" + input },
      { "role": "assistant", "content": reply }
    );
    
    // Cut the stacked conversation history to save money
    if (conversation_cache.length >= conversation_cut_length) {
      let conversation_input = "";
      for (let i of conversation_cache) {
        conversation_input = conversation_input + i.content + "\n";
      }
      conversation_input = conversation_input + "\nsummary:";
      
      logger.debug("Summarizing conversation:", conversation_input);
      
      const conversation_processed_input = [
        { role: "system", content: "Summarize all the context in this following Discord chat for Nattochan to read, given that Nattochan is a anime style female chatbot." },
        { role: "user", content: conversation_input }
      ];
      
      const brief = await ai.chat.completions.create({
        model: 'gpt-4o',
        messages: conversation_processed_input,
        temperature: 0.12,
        max_tokens: 1000
      });
      
      const briefed = brief.choices[0].message.content;
      logger.info("Conversation summarized:", briefed);
      
      conversation_cache = [{ 'role': 'user', 'content': `previous conversation context:${briefed}` }];
    }

    logger.info(`AI chat response sent to ${message.author.tag}`);
  } catch (error) {
    message.channel.stopTyping();
    logger.error('Error in AI chat:', error);
    
    if (error.status === 401) {
      await message.channel.send('AI service authentication failed. Please check API key configuration.');
    } else if (error.status === 429) {
      await message.channel.send('Too many requests. Please try again later.');
    } else {
      await message.channel.send('Sorry, I encountered an error processing your message.');
    }
  }
}

module.exports = {
  initializeOpenAI,
  handleAIChat,
};
