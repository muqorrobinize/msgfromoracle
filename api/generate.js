// api/generate.js - Vercel Serverless Function with Enhanced API Key Rotation and Retry Logic

/**
 * Shuffles an array in place.
 * @param {Array} array An array containing the items.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Fetches data from a Gemini API endpoint with automatic key rotation and retries.
 * @param {string} apiUrl The API URL to fetch.
 * @param {object} payload The payload to send with the request.
 * @returns {Promise<object>} The JSON response from the API.
 */
async function fetchWithRetry(apiUrl, payload) {
    const keys = process.env.GEMINI_API_KEYS;
    if (!keys) {
        throw new Error("GEMINI_API_KEYS environment variable is not set.");
    }
    const keyArray = keys.split(',').map(key => key.trim());
    shuffleArray(keyArray); // Shuffle keys for better load distribution

    let lastError = null;

    for (const apiKey of keyArray) {
        try {
            const fullApiUrl = `${apiUrl}?key=${apiKey}`;
            const response = await fetch(fullApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                return await response.json(); // Success! Return the data.
            }
            
            // Log non-critical errors (like quota issues) and prepare to retry
            const errorText = await response.text();
            console.warn(`API call with a key failed (Status: ${response.status}). Retrying with next key. Error: ${errorText}`);
            lastError = new Error(`API Error: ${response.status} - ${errorText}`);

        } catch (error) {
            console.warn(`A network or fetch error occurred with a key. Retrying. Error: ${error.message}`);
            lastError = error;
        }
    }

    // If all keys have been tried and failed
    throw new Error(`All API keys failed. Last known error: ${lastError.message}`);
}


async function handleInterpretation(req, res) {
    const { name, aspiration } = req.body;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent`;
    
    const systemPrompt = `Anda adalah Pujangga Sarkas bernama Been. Anda sinis terhadap harapan manusia tapi mengungkapkannya lewat puisi. Buat NAMA PUISI yang absurd, INTERPRETASI TERTULIS (puitis, netral, 1-2 kalimat), dan BISIKAN PUJANGGA (sangat mengejek, menyebut nama pengguna, dan memuji diri Anda. 2-3 kalimat). JAWAB HANYA DALAM FORMAT JSON {"card_name": "NAMA PUISI", "written_interpretation": "INTERPRETASI TERTULIS", "spoken_interpretation": "BISIKAN PUJANGGA"}. Semua teks dalam Bahasa Indonesia. Tanpa markdown.`;
    const payload = {
        "system_instruction": { "parts": [{ "text": systemPrompt }] },
        "contents": [{ "parts": [{ "text": `Nama: ${name}, Harapan: ${aspiration}` }] }]
    };

    try {
        const data = await fetchWithRetry(apiUrl, payload);
        const text = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
        res.status(200).json(JSON.parse(text));
    } catch (error) {
        console.error("Failed to get interpretation after all retries:", error);
        res.status(500).json({ error: `Gagal mendapatkan interpretasi: ${error.message}` });
    }
}

async function handleImage(req, res) {
    const { cardName } = req.body;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`;

    const payload = {
        instances: [{ prompt: `An abstract, psychedelic artwork representing a poem titled "${cardName}". Style of 1970s rock posters, trippy, surreal, illustrative, vibrant dark navy blue, hot pink and cyan, detailed.` }],
        parameters: { "sampleCount": 1 }
    };

    try {
        const result = await fetchWithRetry(apiUrl, payload);
        if (result.predictions?.[0]?.bytesBase64Encoded) {
            res.status(200).json({ imageContent: result.predictions[0].bytesBase64Encoded });
        } else {
            throw new Error("No image data in Imagen response");
        }
    } catch (error) {
        console.error("Failed to generate image after all retries:", error);
        res.status(500).json({ error: `Gagal menghasilkan gambar: ${error.message}` });
    }
}

async function handleTts(req, res) {
    const { text, voice } = req.body;

    try {
        let audioContent, mimeType;

        if (voice === 'gemini') {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`;
            const payload = {
                contents: [{ parts: [{ text: `Ucapkan dalam bahasa Indonesia dengan suara berat, puitis, dan sedikit mengejek: ${text}` }] }],
                generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Algenib' } } } },
            };
            const result = await fetchWithRetry(apiUrl, payload);
            const part = result?.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData?.data) {
                audioContent = part.inlineData.data;
                mimeType = part.inlineData.mimeType;
            } else {
                throw new Error("No audio data in Gemini TTS response");
            }
        } else { // voice === 'voicerss'
            const apiKey = process.env.VOICERSS_API_KEY;
            if (!apiKey) throw new Error("VOICERSS_API_KEY not set");
            const params = new URLSearchParams({ key: apiKey, src: text, hl: 'id-id', v: 'Andika', r: '-2', c: 'MP3', b64: 'true' });
            const voicerssApiUrl = `https://api.voicerss.org/?${params.toString()}`;
            const apiResponse = await fetch(voicerssApiUrl);
            if (!apiResponse.ok) throw new Error(`VoiceRSS API error: ${apiResponse.statusText}`);
            const base64Audio = await apiResponse.text();
            audioContent = base64Audio.split(',')[1];
            mimeType = 'audio/mpeg';
        }
        
        res.status(200).json({ audioContent, mimeType });

    } catch (error) {
        console.error("Failed to process TTS request:", error);
        res.status(500).json({ error: `Gagal memproses audio: ${error.message}` });
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { action } = req.body;

    switch (action) {
        case 'getInterpretation':
            return handleInterpretation(req, res);
        case 'getImage':
            return handleImage(req, res);
        case 'getTts':
            return handleTts(req, res);
        default:
            return res.status(400).json({ message: 'Invalid action specified' });
    }
}

