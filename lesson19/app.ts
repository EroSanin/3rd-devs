const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const https = require('https');
const http = require('http');
import { load } from 'cheerio';
import { exec } from 'child_process';
import util from 'util';
import express from 'express';
import { OpenAIService } from './OpenAIService';
import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import type OpenAI from 'openai';
import { mapperPrompt } from './prompts';


const execAsync = util.promisify(exec);
const axios = require('axios');

const app = express();
const port = 3000;
app.use(express.json());
app.listen(port, () => console.log(`Server running at http://localhost:${port}. Listening for POST /lesson requests`));

const openaiService = new OpenAIService(); 


// model functions
function createSystemPrompt(summarization: string): ChatCompletionMessageParam {
  return { 
    role: "system", 
    content: `You are Alice, a helpful assistant who speaks using as few words as possible. 

    ${summarization ? `Here is a summary of the conversation so far: 
    <conversation_summary>
      ${summarization}
    </conversation_summary>` : ''} 
    
    Let's chat!` 
  };
};

async function sendToModel(systemPrompt: ChatCompletionMessageParam, userPrompt: string): Promise<string> {


  const userMessage: ChatCompletionMessageParam = {
    role: "user",
    content: userPrompt
  };

  const response = await openaiService.completion({
    messages: [systemPrompt, userMessage],
    model: "gpt-4o",
    stream: false
  }) as OpenAI.Chat.Completions.ChatCompletion;


  if (isChatCompletion(response)) {
    const llmAnswer = response.choices[0]?.message?.content?.trim() ?? "There was no response";
    //console.log("✅ LLM Answer:", llmAnswer);
    return llmAnswer;
  } else {
    console.error("❌ Received a streaming response when not expected.");
    return "There was an error";
  }
 
};

function isChatCompletion(
  response: unknown
): response is ChatCompletion {
  return (
    typeof response === "object" &&
    response !== null &&
    "choices" in response
  );
}


// Hack https://xyz.ag3nts.org/
app.post('/lesson', async (req, res) => {
  console.log(`Get req: ${req}`)
  try {
    const { instruction } = req.body;
    console.log(`Request check: ${instruction}`)
    //if (!instruction) {
    //  return res.status(400).json({ error: 'Missing "instruction" in request body' });
    //}

    // Assume mapperPrompt is a constant or a function that provides a base prompt
    const systemPrompt = createSystemPrompt(mapperPrompt);

    // Send to model - pass the prompt and the instruction
    console.log(`Message: ${instruction}`)
    let result = await sendToModel(systemPrompt, instruction);
    console.log(`Anwser: ${result}`)

    // Respond with the result
    res.status(200).json({ description: result });
  } catch (error) {
    console.error('Error handling question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})
