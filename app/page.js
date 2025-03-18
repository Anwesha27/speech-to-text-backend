// app/page.js
'use client'
import React, { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import AudioRecorder from '../components/AudioRecorder';
import TranscriptionDisplay from '../components/TranscriptionDisplay';

export default function Home() {
    const [transcription, setTranscription] = useState('');
    const [audioFile, setAudioFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [transcriptions, setTranscriptions] = useState([]);

    useEffect(() => {
        // Fetch initial transcriptions (if needed)
    }, []);

    const handleFileSelect = (file) => {
        setAudioFile(file);
    };

    const handleRecordingComplete = (blob) => {
        setAudioFile(blob);
    };

    const processAudio = async () => {
        if (!audioFile) {
            alert("Please select or record an audio file.");
            return;
        }

        setLoading(true);
        setTranscription('Generating transcription...');

        const formData = new FormData();
        formData.append('audio', audioFile);

        try {
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setTranscription(data.transcription);
        } catch (error) {
            console.error("Error sending audio:", error);
            setTranscription('Error generating transcription.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Speech-to-Text Application</h1>
            <FileUpload onFileSelect={handleFileSelect} />
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />
            {audioFile && (
                <>
                    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={processAudio} disabled={loading}>
                        {loading ? 'Processing...' : 'Process Audio'}
                    </button>
                    <TranscriptionDisplay transcription={transcription} />
                </>
            )}
        </div>
    );
}
