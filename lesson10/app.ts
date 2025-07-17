const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
import type { ChatCompletionMessageParam, ChatCompletionChunk, ChatCompletionContentPartText, ChatCompletion } from "openai/resources/chat/completions";
import { audioAnalizePrompt, imageAnalizePrompt, textAnalizePrompt } from "./prompts.ts";
import { OpenAIService } from './OpenAIService.ts';
import { ImageAiService } from './ImageAiService.ts';
import type OpenAI from 'openai';
import sanitizeHtml from 'sanitize-html';

const openaiService = new OpenAIService(); // Załaduj swój serwis do obsługi OpenAI
const imageaiservice = new ImageAiService();

const filesPath = path.join(__dirname, 'Files');

const peopleFiles: string[] = [];
const hardwereFiles: string[] = [];

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
    console.log("✅ LLM Answer:", llmAnswer);
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




function sanitizeHtmlToPlainText(inputFilePath: string, outputFilePath: string): void {
  try {
    // Read the HTML file content
    const htmlContent = fs.readFileSync(inputFilePath, 'utf-8');

    // Sanitize: remove all tags, scripts, styles
    const plainText = sanitizeHtml(htmlContent, {
      allowedTags: [], // Remove all tags
      allowedAttributes: {}, // Remove all attributes
      allowedSchemes: [], // Remove all URL schemes
    }).replace(/\s+/g, ' ').trim(); // Normalize whitespace

    // Write the plain text to a new file
    //fs.writeFileSync(outputFilePath, plainText, 'utf-8');
    fs.appendFileSync(outputFilePath, `${plainText}\r\n`, 'utf-8');
    console.log(`Cleaned plain text saved to: ${outputFilePath}`);
  } catch (error) {
    console.error('Error sanitizing HTML file:', error);
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

// Main Execution Function
(async() => {

  

  const files = getAllFilesRecursively(filesPath);

  for (const fileName of files) {
    //const filePath = path.join(filesPath, fileName);
    const filePath = fileName;



    const ext = path.extname(fileName).toLowerCase();

    try {
      const buffer = fs.readFileSync(filePath);
      const mimeType = mime.lookup(ext);

      if (ext === '.mp3') {
        console.log(`🔊 Transkrypcja audio: ${fileName}`);
        let systemPrompt = createSystemPrompt(audioAnalizePrompt);
        const transcription = await openaiService.transcribe(buffer);
        console.log(`📝 Transkrypcja: ${transcription}`);
        fs.appendFileSync(path.join(__dirname, 'output.txt'), `${transcription}\r\n`, 'utf-8');
        //let response = await sendToModel(systemPrompt, transcription);
        //console.log(`📊 Plik: ${fileName} - ${response}`);

      }


      else if (ext === '.html') {
          sanitizeHtmlToPlainText(filePath, path.join(__dirname, 'output.txt'));
      }

      else if (ext === '.png') {
        console.log(`🖼️ Analiza obrazu: ${fileName}`);

        const analysis = await imageaiservice.processImageSendToModel(filePath, imageAnalizePrompt, "");
        fs.appendFileSync(path.join(__dirname, 'output.txt'), `${analysis}\r\n`, 'utf-8');
        console.log(`📊 Wynik analizy obrazu: ${analysis}`);

      }

      else {
        console.log(`⛔️ Nieobsługiwany typ pliku: ${fileName}`);
      }



    } catch (err) {
      console.error(`❌ Błąd podczas analizy pliku ${fileName}:`, err);
    }
  }


})();

