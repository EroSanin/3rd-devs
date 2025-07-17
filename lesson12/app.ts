const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
import type { ChatCompletionMessageParam, ChatCompletionChunk, ChatCompletionContentPartText, ChatCompletion } from "openai/resources/chat/completions";
import { OpenAIService } from "./OpenAIService.ts"
import type OpenAI from 'openai';
import { VectorService } from "./VectorService.ts";

const openaiService = new OpenAIService(); // Załaduj swój serwis do obsługi OpenAI


const filesPath = path.join(__dirname, 'weapons_tests');
const openai = new OpenAIService();
const vectorService = new VectorService(openai);

// Main Execution Function
(async() => {

  await vectorService.ensureCollection("weapons_tests");
  let switchONOff = true;

  if (switchONOff) {

    const files = fs.readdirSync(filesPath);

    for (const fileName of files) {
      //const filePath = path.join(filesPath, fileName);
      const filePath = path.join(filesPath, fileName);

      
    // Use regex to extract date components
    // Extract the date part using regex
    const match = fileName.match(/^(\d{4})_(\d{2})_(\d{2})/);

      if (match) {
          const [ , year, month, day ] = match;
          const formattedDate = `${year}-${month}-${day}`;
          console.log(formattedDate);  // Output: 2024-01-08
          let fileContent = fs.readFileSync(filePath, 'utf-8');
          await vectorService.addReportToCollection("weapons_tests", formattedDate, fileContent);
      } else {
          console.error("Filename does not contain a valid date.");
      }

    }

  }

  let question = "W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?";

  let results = await vectorService.performSearch("weapons_tests", question, 1);
  console.log(results);

})();

