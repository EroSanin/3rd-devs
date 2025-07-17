const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
import type { ChatCompletionMessageParam, ChatCompletionChunk, ChatCompletionContentPartText, ChatCompletion } from "openai/resources/chat/completions";
import { factsAnalizePrompt, textAnalizePrompt } from "./prompts.ts"
import { OpenAIService } from "./OpenAIService.ts"
import type OpenAI from 'openai';

const openaiService = new OpenAIService(); // Załaduj swój serwis do obsługi OpenAI

const filesPath = path.join(__dirname, 'pliki_z_fabryki');


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


function loadAllFacts(directoryPath:string) {
  const fullPath = path.resolve(directoryPath);
  const files = fs.readdirSync(fullPath);
  
  let combinedText = '';

  for (const file of files) {
    const filePath = path.join(fullPath, file);
    if (fs.statSync(filePath).isFile() && path.extname(file) === '.txt') {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      combinedText += fileContent + '\n'; // Optional: add a newline between files
    }
  }

  return combinedText;
}

// Main Execution Function
(async() => {

  
  let factsRaw = loadAllFacts(path.join(__dirname, 'pliki_z_fabryki/facts'))
  let facts = await sendToModel(createSystemPrompt(factsAnalizePrompt), factsRaw);
  console.log(`📄 Shoreted Facts: ${facts}`);
  //const files = getAllFilesRecursively(filesPath);
  const files = fs.readdirSync(filesPath);

  for (const fileName of files) {
    //const filePath = path.join(filesPath, fileName);
    const filePath = path.join(filesPath, fileName);



    const ext = path.extname(fileName).toLowerCase();

    try {
      const buffer = fs.readFileSync(filePath);
      const mimeType = mime.lookup(ext);

      if (ext === '.txt') {

        //console.log(`📄 Analiza tekstu: ${fileName}`);
        const content = buffer.toString('utf-8');

        let finalPrompt = textAnalizePrompt.replace('{{facts}}', facts);
        finalPrompt = textAnalizePrompt.replace('{{fileName}}', fileName);
      
        let systemPrompt = createSystemPrompt(finalPrompt);
        let response = await sendToModel(systemPrompt, content);
        console.log(`📊 ${fileName} ${response}`);
      }


      else {
        console.log(`⛔️ Nieobsługiwany typ pliku: ${fileName}`);
      }



    } catch (err) {
      console.error(`❌ Błąd podczas analizy pliku ${fileName}:`, err);
    }
  }


})();

