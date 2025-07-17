const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
import type { ChatCompletionMessageParam, ChatCompletionChunk, ChatCompletionContentPartText, ChatCompletion } from "openai/resources/chat/completions";
import { audioAnalizePrompt, imageAnalizePrompt, textAnalizePrompt } from "./prompts";
import { readFileSync } from "fs";
import sharp from "sharp";
import { join } from "path";
import type { ResizedImageMetadata } from "./app.dt";
import { OpenAIService } from './OpenAIService';
import type OpenAI from 'openai';

const openaiService = new OpenAIService(); // Załaduj swój serwis do obsługi OpenAI

const factoryPath = path.join(__dirname, 'pliki_z_fabryki');

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

const OPTIMIZED_IMAGE_PATH = join(__dirname, 'lessons_optimized.png');
const COMPRESSION_LEVEL = 5;
const IMAGE_DETAIL: 'low' | 'high' = 'high';

async function processImage(path:string): Promise<{ imageBase64: string; metadata: ResizedImageMetadata }> {
  try {
      const imageBuffer = readFileSync(path);
      const resizedImageBuffer = await sharp(imageBuffer)
          .resize(2048, 2048, { fit: 'inside' })
          .png({ compressionLevel: COMPRESSION_LEVEL })
          .toBuffer();

      await sharp(resizedImageBuffer).toFile(join(__dirname, 'temp.png'));

      const imageBase64 = resizedImageBuffer.toString('base64');
      const metadata = await sharp(resizedImageBuffer).metadata();

      if (!metadata.width || !metadata.height) {
          throw new Error("Unable to retrieve image dimensions.");
      }

      return { imageBase64, metadata: { width: metadata.width, height: metadata.height } };
  } catch (error) {
      console.error("Image processing failed:", error);
      throw error;
  }
}

function transformMessageContent(message: ChatCompletionMessageParam): ChatCompletionMessageParam {
  if (typeof message.content === 'string') {
      return { role: message.role, content: message.content } as ChatCompletionMessageParam;
  } else {
      const textContent = message.content?.find((contentPart): contentPart is ChatCompletionContentPartText => 'text' in contentPart)?.text as string;
      return { role: message.role, content: textContent } as ChatCompletionMessageParam;
  }
}

async function processImageSendToModel(path:string, systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const { imageBase64, metadata } = await processImage(path);
    const imageTokenCost = await openaiService.calculateImageTokens(metadata.width, metadata.height, IMAGE_DETAIL);
    
    const messages: ChatCompletionMessageParam[] = [
        {
            role: "system",
            content: `${systemPrompt}`
        },
        {
            role: "user",
            content: [
                {
                    type: "image_url",
                    image_url: {
                        url: `data:image/jpeg;base64,${imageBase64}`,
                        detail: "high"
                    }
                },
                {
                    type: "text",
                    text: `${userPrompt}`
                },
            ]
        }
    ];

    const mappedMessages: ChatCompletionMessageParam[] = messages.map(transformMessageContent);
    const textTokenCost = await openaiService.countTokens(mappedMessages);
    const totalTokenCost = imageTokenCost + textTokenCost;


    const chatCompletion = await openaiService.completion({
      messages: messages,
      model: "gpt-4o",
      stream: false,
      jsonMode: false,
      maxTokens: 1024
    })  as ChatCompletion;
    let content = chatCompletion.choices[0].message.content ?? "No content returned by model.";

    console.log(content);
    console.log(`-----------------------------------`);
    console.log(`Image Tokens: ${imageTokenCost}`);
    console.log(`Text Tokens: ${textTokenCost}`);
    console.log(`-----------------------------------`);
    console.log(`Estimated Prompt Tokens: ${totalTokenCost}`);
    console.log(`Actual Prompt Tokens: ${chatCompletion.usage?.prompt_tokens}`);
    console.log(`-----------------------------------`);
    console.log(`Total Token Usage: ${chatCompletion.usage?.total_tokens}`);

    return content;

  } catch (error) {
      console.error("An error occurred during execution:", error);
      return "Error occurred during image processing.";
  }
}

function pushCategory(category:string, filename: string){
  if (category === "People") {
    peopleFiles.push(filename);
  } else (category === "Hardware") 
  {
    hardwereFiles.push(filename);
  }

}

// Main Execution Function
(async() => {
  const files = fs.readdirSync(factoryPath);

  for (const fileName of files) {
    const filePath = path.join(factoryPath, fileName);

    // Pomiń foldery i niepożądane pliki
    const stats = fs.statSync(filePath);
    if (
      stats.isDirectory() ||
      fileName === 'facts' ||
      fileName === 'weapons_tests.zip' ||
      !path.extname(fileName)
    ) {
      continue;
    }

    const ext = path.extname(fileName).toLowerCase();

    try {
      const buffer = fs.readFileSync(filePath);
      const mimeType = mime.lookup(ext);

      if (ext === '.mp3') {
        console.log(`🔊 Transkrypcja audio: ${fileName}`);
        let systemPrompt = createSystemPrompt(audioAnalizePrompt);
        const transcription = await openaiService.transcribe(buffer);
        console.log(`📝 Transkrypcja: ${transcription}`);
        let response = await sendToModel(systemPrompt, transcription);
        console.log(`📊 Plik: ${fileName} - ${response}`);
        pushCategory(response, fileName);
      }

      else if (ext === '.txt') {
        console.log(`📄 Analiza tekstu: ${fileName}`);
        const content = buffer.toString('utf-8');

        let systemPrompt = createSystemPrompt(textAnalizePrompt);
        let response = await sendToModel(systemPrompt, content);
        console.log(`📊 Plik: ${fileName} - ${response}`);
        pushCategory(response, fileName);
      }

      else if (ext === '.png') {
        console.log(`🖼️ Analiza obrazu: ${fileName}`);

        const analysis = await processImageSendToModel(filePath, imageAnalizePrompt, "");
        console.log(`📊 Wynik analizy obrazu: ${analysis}`);
        pushCategory(analysis, fileName);
      }

      else {
        console.log(`⛔️ Nieobsługiwany typ pliku: ${fileName}`);
      }



    } catch (err) {
      console.error(`❌ Błąd podczas analizy pliku ${fileName}:`, err);
    }
  }

  const answer = {
    answer: {
      people: peopleFiles,
      hardware: hardwereFiles
    }
  };

  const jsonString = JSON.stringify(answer, null, 2);

  console.log(jsonString);


})();

