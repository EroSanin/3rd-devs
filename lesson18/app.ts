const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const https = require('https');
const http = require('http');
import { load } from 'cheerio';
import { exec } from 'child_process';
import util from 'util';
import TurndownService from 'turndown';
import type { ChatCompletionMessageParam, ChatCompletionChunk, ChatCompletionContentPartText, ChatCompletion } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';
import type OpenAI from 'openai';
import { checkifanwseristhere, searchforlink } from './prompts';

const execAsync = util.promisify(exec);
const axios = require('axios');
const openaiService = new OpenAIService(); 

//fetch pages
async function fetchPage(url:string): Promise<string> {

  try {
    const { stdout: html } = await execAsync(`curl -X GET "${url}" -H "accept: text/html"`);

    // Load HTML
    const $ = load(html);

    // Optionally extract a specific part, or just convert the whole body
    const bodyHtml = $('body').html() || '';

    return bodyHtml;

  } catch (err) {
    console.error('Failed to fetch :', err);
  }

  return "";

}


async function fetchAndConvertToMarkdown(url:string): Promise<string> {
  let markdown = '';

  try {
    const { stdout: html } = await execAsync(`curl -X GET "${url}" -H "accept: text/html"`);

    // Load HTML
    const $ = load(html);

    // Optionally extract a specific part, or just convert the whole body
    const bodyHtml = $('body').html() || '';

    // Convert to Markdown using Turndown
    const turndownService = new TurndownService();
    markdown = turndownService.turndown(bodyHtml);

    console.log(markdown);


  } catch (err) {
    console.error('Failed to fetch or convert:', err);
  }

  return markdown;
}



async function fetchAndPrintQuestions(url: string): Promise<string[]> {
  try {

    const response = await axios.get(url);
    const data = response.data as Record<string, string>;

    // Explicitly tell TypeScript that these are strings
    const result = Object.values(data) as string[];

    return result;
  } catch (error: any) {
    console.error('Error fetching questions:', error.message);
    return [];
  }
}


//LLM

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

// Main Execution Function
(async() => {

  //Step 1 questions
  let url = 'https://softo.ag3nts.org/';

  let questions = await fetchAndPrintQuestions('https://c3ntrala.ag3nts.org/data/3b8bdc19-ffb0-4a69-b018-376440ced8d7/softo.json');
  for (const [index, question] of questions.entries()) {
    console.log(`${index + 1}. ${question}`);

    //Step 2 markdown
    let isAnwser: string;
    do {

      let page = await fetchPage(url);
      let markdown = await fetchAndConvertToMarkdown(url);
      isAnwser = await sendToModel(createSystemPrompt(checkifanwseristhere.replace('{{QUESTION}}', question)), markdown);

      if (isAnwser.includes("NO"))
      {
        url = await sendToModel(createSystemPrompt(searchforlink.replace('{{QUESTION}}', question)), page);
      }

    } while (isAnwser.includes("NO"));

    console.log(`@Anwser ${index + 1}: ${isAnwser}`)



  };



})();


