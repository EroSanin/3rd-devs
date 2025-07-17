import express from 'express';
import { OpenAIService } from './OpenAIService';
import multer from 'multer';


const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB in bytes
  }
});
/*
Start Express server
*/


const app = express();
const port = 3000;
app.use(express.json());
app.listen(port, () => console.log(`Server running at http://localhost:${port}. Listening for POST /api/chat requests`));

const openaiService = new OpenAIService();
let previousSummarization = "";

app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  const audioFile = req.file;
  if (!audioFile) {
      return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
      // Pass the file buffer to the transcription service
      const transcription = await openaiService.transcribe(audioFile.buffer);
      return res.json({ transcription });
  } catch (error) {
      console.error('Transcription error:', error);
      res.status(500).json({ error: 'An error occurred during transcription' });
  }
});