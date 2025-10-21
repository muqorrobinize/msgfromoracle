// TIDAK perlu 'import fetch' lagi, karena kita menggunakan fetch bawaan Vercel.

// Fungsi pembantu untuk mengacak array di tempat
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Fungsi utama yang akan dijalankan oleh Vercel
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // --- Membaca Environment Variables dengan lebih aman ---
  const geminiKeysString = process.env.GEMINI_API_KEYS || '';
  const voiceRssKey = (process.env.VOICERSS_API_KEY || '').trim();
  
  const geminiApiKeys = geminiKeysString.split(',').map(key => key.trim()).filter(key => key);

  console.log(`Ditemukan ${geminiApiKeys.length} kunci Gemini.`);
  console.log(`Kunci VoiceRSS ${voiceRssKey ? 'ditemukan' : 'TIDAK ditemukan'}.`);

  if (geminiApiKeys.length === 0 || !voiceRssKey) {
    console.error("Environment variables tidak diatur dengan benar.");
    return res.status(500).json({ error: 'Konfigurasi server bermasalah.' });
  }
  
  const { type, payload } = req.body;
  console.log(`Menerima permintaan untuk tipe: ${type}`);

  try {
    let result;
    shuffle(geminiApiKeys);

    const tryApiCall = async (apiFunction) => {
      let lastError = null;
      for (const key of geminiApiKeys) {
        try {
          const response = await apiFunction(key);
          return response;
        } catch (error) {
          lastError = error;
          console.warn(`Panggilan API gagal dengan kunci yang berakhir pada '...${key.slice(-4)}'. Error: ${error.message}`);
        }
      }
      throw new Error(`Semua kunci API Gemini gagal. Error terakhir: ${lastError.message}`);
    };

    switch (type) {
      case 'text':
        result = await tryApiCall(async (key) => {
          // --- PERUBAHAN: Menggunakan model yang lebih baru dan stabil ---
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error(`API Error ${response.status}: ${response.statusText}`);
          return response.json();
        });
        break;

      case 'image':
        result = await tryApiCall(async (key) => {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error(`API Error ${response.status}: ${response.statusText}`);
          return response.json();
        });
        break;

      case 'tts':
         result = await tryApiCall(async (key) => {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
          });
          if (!response.ok) throw new Error(`API Error ${response.status}: ${response.statusText}`);
          return response.json();
        });
        break;

      case 'greeting-tts':
        const params = new URLSearchParams({ key: voiceRssKey, src: payload.text, hl: 'id-id', v: 'Andika', r: '-2', c: 'MP3', f: '16khz_16bit_stereo' });
        const url = `https://api.voicerss.org/?${params.toString()}`;
        result = { url };
        break;

      default:
        return res.status(400).json({ error: 'Tipe permintaan tidak valid' });
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Gagal memproses permintaan setelah mencoba semua kunci:', error.message);
    res.status(500).json({ error: 'Terjadi gangguan di pihak server.' });
  }
}
