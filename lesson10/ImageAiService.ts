import type { ChatCompletion, ChatCompletionContentPartText, ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { OpenAIService } from "./OpenAIService";
import { join } from "path";
import type { ResizedImageMetadata } from "./app.dt";
import { readFileSync } from "fs";
import sharp from "sharp";

const OPTIMIZED_IMAGE_PATH = join(__dirname, 'lessons_optimized.png');
const COMPRESSION_LEVEL = 5;
const IMAGE_DETAIL: 'low' | 'high' = 'high';


export class ImageAiService {
    private openaiservice: OpenAIService;

    constructor() {
        this.openaiservice = new OpenAIService();
      }

    private transformMessageContent(message: ChatCompletionMessageParam): ChatCompletionMessageParam {
        if (typeof message.content === 'string') {
            return { role: message.role, content: message.content } as ChatCompletionMessageParam;
        } else {
            const textContent = message.content?.find((contentPart): contentPart is ChatCompletionContentPartText => 'text' in contentPart)?.text as string;
            return { role: message.role, content: textContent } as ChatCompletionMessageParam;
        }
    }

    private async processImage(path:string): Promise<{ imageBase64: string; metadata: ResizedImageMetadata }> {
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

    async processImageSendToModel(path:string, systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const { imageBase64, metadata } = await this.processImage(path);
      const imageTokenCost = await this.openaiservice.calculateImageTokens(metadata.width, metadata.height, IMAGE_DETAIL);
      
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
  
      const mappedMessages: ChatCompletionMessageParam[] = messages.map(this.transformMessageContent);
      const textTokenCost = await this.openaiservice.countTokens(mappedMessages);
      const totalTokenCost = imageTokenCost + textTokenCost;
  
  
      const chatCompletion = await this.openaiservice.completion({
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

}