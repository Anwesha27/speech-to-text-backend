// backend/transcriptionService.js
import { AutomaticSpeechRecognition } from "deepinfra";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs'; // Import the 'fs' module

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEEPINFRA_API_KEY = process.env.DEEPINFRA_TOKEN; // Use environment variables
const MODEL = "openai/whisper-large-v3";

const transcribeAudio = async (audioFilePath) => {
    try {
        if (!DEEPINFRA_API_KEY) {
            throw new Error("DEEPINFRA_TOKEN environment variable not set.");
        }

        const client = new AutomaticSpeechRecognition(MODEL, DEEPINFRA_API_KEY);

        if (!fs.existsSync(audioFilePath)) {
            throw new Error(`Audio file not found: ${audioFilePath}`);
        }

        const input = {
            audio: audioFilePath,
        };

        const response = await client.generate(input);

        if (!response || !response.text) {
            throw new Error("DeepInfra API did not return a valid transcription.");
        }

        return response.text;
    } catch (error) {
        console.error("Error during transcription:", error);
        throw error;
    }
};

export default transcribeAudio;
