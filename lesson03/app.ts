import express from 'express';
import { OpenAIService } from './OpenAIService';
import type { ChatCompletionMessageParam, ChatCompletionChunk } from "openai/resources/chat/completions";
import type OpenAI from 'openai';
import util from 'util';
import { load } from 'cheerio';
import { exec } from 'child_process';
import axios from 'axios';
import { useInstructionPrompt } from './prompts';
import { staticFile } from './staticFile';

/*
Start Express server
*/

const app = express();
const port = 3000;
app.use(express.json());
app.listen(port, () => console.log(`Server running at http://localhost:${port}. Listening for POST /api/chat requests`));

const openaiService = new OpenAIService();
let previousSummarization = "";


// Function to create system prompt
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


async function sendPromptIfQuestionExist(question: string): Promise<string> {
  try {
    const systemPrompt = createSystemPrompt(useInstructionPrompt); // or false, depending on your setup

    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: question
    };

    const assistantResponse = await openaiService.completion(
      [systemPrompt, userMessage],
      "gpt-4o",
      false
    ) as OpenAI.Chat.Completions.ChatCompletion;

    const llmAnswer = assistantResponse.choices[0]?.message?.content?.trim();

    if (!llmAnswer) {
      console.error(`No answer returned by LLM for: "${question}"`);
      return "No answer generated.";
    }

    console.log(`LLM Answer for "${question}": ${llmAnswer}`);
    return llmAnswer;

  } catch (err) {
    console.error(`Failed to get LLM answer for "${question}":`, err);
    return "Error generating answer.";
  }
};


export function convertStaticFileModelToParsedReport(input: StaticFileModel): ParsedReport {
  const { apikey, description, copyright, "test-data": testData } = input;

  const answer = {
    apikey,
    description,
    copyright,
    "test-data": testData
  };

  const parsedReport: ParsedReport = {
    task: "JSON",
    apikey,
    answer
  };

  return parsedReport;
}

const API_URL = 'https://c3ntrala.ag3nts.org/report';

//interface
export interface TestItem {
  question: string;
  answer: number;
  test?: Test
}

export interface Test {
  q: string;
  a: string;
}

export interface StaticFileModel {
  apikey: string;
  description: string;
  copyright: string;
  "test-data": TestItem[];
}

export interface AnswerData {
  apikey: string;
  description: string;
  copyright: string;
  "test-data": TestItem[];
}

export interface ParsedReport {
  task: string;
  apikey: string;
  answer: AnswerData;
}

interface MessageResponse {
  code: number;
  message: string;
}



// Hack https://xyz.ag3nts.org/
app.post('/hackxyz', async (req, res) => {
  try {
    const parsed: StaticFileModel = JSON.parse(staticFile) as StaticFileModel;

    for (const item of parsed["test-data"]) {
      const parts = item.question.split("+").map(part => parseInt(part.trim(), 10));

      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const correctAnswer = parts[0] + parts[1];

        if (item.answer !== correctAnswer) {
          console.log(`Fixing answer for "${item.question}": ${item.answer} → ${correctAnswer}`);
          item.answer = correctAnswer;
        }
      } else {
        console.warn(`Invalid question format: "${item.question}"`);
      }

      if (item.test?.q) {
        try {
          const response = await sendPromptIfQuestionExist(item.test.q);
          item.test.a = response;
          console.log(`Updated test.a for "${item.test.q}": ${response}`);
        } catch (err) {
          console.error(`Failed to update test.a for "${item.test.q}":`, err);
        }
      }
    }

    const parsedReport: ParsedReport = convertStaticFileModelToParsedReport(parsed);


    const readyResponse = await axios.post<{ code: string; message: string }>(
      API_URL,
      parsedReport,
      {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    const { code, message } = readyResponse.data;

    if (code == null || message == null) { // catches both null and undefined
      console.warn('No message received.');
      console.warn(readyResponse.data);
      return res.status(500).json({ error: 'Invalid response from remote API' });
    }

    console.log(`Received: ${message}`);
    return res.json(readyResponse.data);

  } catch (err) {
    console.error('Unexpected server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});