// app/api/transcribe/route.js
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import axios from 'axios';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio');

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file uploaded.' }, { status: 400 });
        }

        // Convert the audio file to base64
        const fileArrayBuffer = await audioFile.arrayBuffer();
        const fileBuffer = Buffer.from(fileArrayBuffer);
        const audioData = fileBuffer.toString('base64');


        const payload = {
            input: audioData,
            model: "assemblyai" // Replace with your desired model
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`,
        };

        const response = await axios.post('https://api.deepinfra.com/v1/inference', payload, { headers: headers });

        if (response.status === 200 && response.data && response.data.results) {
            const transcription = response.data.results.join('\n');

            // Initialize Supabase client
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_ANON_KEY;
            const supabase = createClient(supabaseUrl, supabaseKey);


            // Upload audio file to Supabase storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('audio-files')
                .upload(`${uuidv4()}.${audioFile.name.split('.').pop()}`, fileBuffer, {
                    contentType: audioFile.type,
                    upsert: false
                });

            if (uploadError) {
                console.error('Supabase storage upload error:', uploadError);
                return NextResponse.json({ error: 'Failed to upload audio to Supabase storage.' }, { status: 500 });
            }

            const audioUrl = `${supabaseUrl}/storage/v1/object/public/${uploadData.path}`;

            // Save transcription and audio URL to Supabase database
            const { data: insertData, error: insertError } = await supabase
                .from('transcriptions')
                .insert([{ text: transcription, audio_url: audioUrl }]);

            if (insertError) {
                console.error('Supabase insert error:', insertError);
                return NextResponse.json({ error: 'Failed to save transcription to Supabase.' }, { status: 500 });
            }

            return NextResponse.json({ transcription: transcription }, { status: 200 });
        } else {
            console.error('DeepInfra API Error:', response.status, response.statusText, response.data);
            return NextResponse.json({ error: `DeepInfra API failed with status ${response.status}` }, { status: 500 });
        }
    } catch (error) {
        console.error('Transcription error:', error);
        return NextResponse.json({ error: 'Failed to transcribe audio.' }, { status: 500 });
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
};
