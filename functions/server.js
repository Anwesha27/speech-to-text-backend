import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { AutomaticSpeechRecognition } from "deepinfra";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5175; // Use process.env.PORT for dynamic port binding

app.use(cors());
app.use(express.json());

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL and Key must be provided in environment variables!");
    process.exit(1); // Exit the process if Supabase config is missing
}

const supabase = createClient(supabaseUrl, supabaseKey);

// DeepInfra setup
const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY; // Use environment variable for API key
const MODEL = "openai/whisper-large-v3"; // Specify the DeepInfra model

if (!DEEPINFRA_API_KEY) {
    console.error("DEEPINFRA_API_KEY must be provided in environment variables!");
    process.exit(1); // Exit the process if DeepInfra key is missing
}

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads/');
        fs.mkdirSync(uploadPath, { recursive: true }); // Ensure the directory exists
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Centralized error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No audio file uploaded.');
        }

        const audioFilePath = path.join(__dirname, 'uploads', req.file.originalname);

        // Initialize DeepInfra client
        const client = new AutomaticSpeechRecognition(MODEL, DEEPINFRA_API_KEY);

        // Prepare input for DeepInfra API
        const input = {
            audio: audioFilePath,
        };

        // Call DeepInfra API for transcription
        const response = await client.generate(input);

        if (response && response.text) {
            const transcription = response.text;

            // Save transcription to Supabase
            const { data, error } = await supabase
                .from('transcriptions')
                .insert([{ text: transcription }]);

            if (error) {
                console.error('Supabase error:', error);
            } else {
                console.log('Transcription saved to Supabase:', data);
            }

            fs.unlink(audioFilePath, (err) => {  // Use async unlink
                if (err) {
                    console.error('Error deleting file:', err);
                } else {
                    console.log('File deleted successfully');
                }
            });

            res.json({ transcription: transcription });
        } else {
            console.error('DeepInfra API did not return a valid transcription.');
            fs.unlink(audioFilePath, (err) => {
                if (err) {
                    console.error('Error deleting file:', err);
                }
            });
            res.status(500).json({ error: 'Failed to get transcription from DeepInfra.' });
        }
    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: 'Failed to transcribe audio.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
