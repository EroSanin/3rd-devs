const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const https = require('https');
const http = require('http');
import { IncomingMessage } from 'http';
import type { ChatCompletionMessageParam, ChatCompletionChunk, ChatCompletionContentPartText, ChatCompletion } from "openai/resources/chat/completions";
import type OpenAI from 'openai';
import axios from 'axios';
import { OpenAIService } from './OpenAIService';
import {initialPhoto, imageAnalizePrompt} from './prompts.ts';
import { ImageAiService } from './ImageAiService';


const filesPath = path.join(__dirname, 'fotki');
const openaiService = new OpenAIService(); 
const imageaiservice = new ImageAiService();

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

// IO functions

function downloadImage(url: string, folderPath: string, fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    fs.mkdirSync(folderPath, { recursive: true });

    const filePath = path.join(folderPath, fileName);
    const file = fs.createWriteStream(filePath);

    protocol.get(url, (response: IncomingMessage) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to get image. Status code: ${response.statusCode}`));
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(filePath));
      });
    }).on('error', (err: Error) => {
      fs.unlink(filePath, () => reject(err));
    });
  });
}

async function downloadImagesFromResponse(responseText: string, outputDir: string): Promise<void> {
  const urls = responseText
    .split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0);

  for (const url of urls) {
    const fileName = path.basename(url); // Extract file name from URL
    try {
      const filePath = await downloadImage(url, outputDir, fileName);
      console.log(`Downloaded: ${filePath}`);
    } catch (error) {
      console.error(`Failed to download ${url}:`, (error as Error).message);
    }
  }
}

function getAllFilesRecursively(dirPath: string): string[] {
  let results: string[] = [];

  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(getAllFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}



//API functions


interface PostRequestBody {
  task: string;
  apikey: string;
  answer: string;
}

interface ApiResponse {
  code: number;
  message: string;
}

async function sendJsonPost(url: string, body: PostRequestBody): Promise<ApiResponse> {
  try {
    const response = await axios.post<ApiResponse>(url, body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error sending request:', error?.response?.data || error.message);
    throw new Error('Failed to send POST request');
  }
}

// Main Execution Function
(async() => {

const url = 'https://c3ntrala.ag3nts.org/report'; // Replace with the real endpoint

let requestBody: PostRequestBody = {
  task: 'photos',
  apikey: '3b8bdc19-ffb0-4a69-b018-376440ced8d7',
  answer: 'START'
};

let response = await sendJsonPost(url, requestBody);

let photos = await sendToModel(createSystemPrompt(initialPhoto), response.message);

downloadImagesFromResponse(photos, path.join(__dirname, 'images'));

const filesPath = path.join(__dirname, 'images');
const files = getAllFilesRecursively(filesPath);

for (const fileName of files) {
  //const filePath = path.join(filesPath, fileName);
  let filePath = fileName;

  let analysis: string;
  do {
    console.log('Zaczynam analize:',  filePath);
    analysis = await imageaiservice.processImageSendToModel(filePath, imageAnalizePrompt, "");

    if (!analysis.includes("KONIEC"))
    {
      requestBody.answer = analysis + ' ' + path.basename(filePath);
      console.log('Request:',  requestBody.answer);
      let response = await sendJsonPost(url, requestBody);
      let photo = await sendToModel(createSystemPrompt(initialPhoto), response.message);
      let pathname = new URL(photo).pathname;
      let filename = path.basename(pathname);
      filePath = path.join(__dirname, 'images', filename);
      console.log('new filePath:',  filePath);
      downloadImagesFromResponse(photo, path.join(__dirname, 'images'));
    }


  } while (!analysis.includes("KONIEC"));


}

})();

