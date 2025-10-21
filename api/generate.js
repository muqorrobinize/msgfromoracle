// Menggunakan 'import' karena "type": "module" di package.json
import fetch from 'node-fetch';

// Fungsi pembantu untuk mengacak array di tempat
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Fungsi utama yang akan dijalankan oleh Vercel
export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // --- Membaca Environment Variables dengan lebih aman ---
  // Menghapus spasi ekstra dari variabel lingkungan
  const geminiKeysString = process.env.GEMINI_API_KEYS || '';
  const voiceRssKey = (process.env.VOICERSS_API_KEY || '').trim();
  
  // Memisahkan kunci Gemini dan membersihkan masing-masing kunci
  const geminiApiKeys = geminiKeysString.split(',').map(key => key.trim()).filter(key => key);

  // LOGGING: Cek apakah kunci berhasil dimuat
  console.log(`Ditemukan ${geminiApiKeys.length} kunci Gemini.`);
  console.log(`Kunci VoiceRSS ${voiceRssKey ? 'ditemukan' : 'TIDAK ditemukan'}.`);


  if (geminiApiKeys.length === 0 || !voiceRssKey) {
    console.error("Environment variables tidak diatur dengan benar.");
    return res.status(500).json({ error: 'Konfigurasi server bermasalah.' });
  }
  
  const { type, payload } = req.body;

  // LOGGING: Menampilkan jenis request yang masuk
  console.log(`Menerima permintaan untuk tipe: ${type}`);

  try {
    let result;
    // Mengacak urutan kunci untuk distribusi beban
    shuffle(geminiApiKeys);

    // Fungsi generik untuk mencoba API call dengan rotasi kunci
    const tryApiCall = async (apiFunction) => {
      for (const key of geminiApiKeys) {
        try {
          // Mencoba memanggil fungsi API dengan kunci saat ini
          const response = await apiFunction(key);
          return response; // Jika berhasil, kembalikan respons
        } catch (error) {
          // LOGGING: Catat error untuk kunci spesifik ini
          console.warn(`Panggilan API gagal dengan kunci yang berakhir pada '...${key.slice(-4)}'. Error: ${error.message}`);
          // Lanjutkan ke kunci berikutnya
        }
      }
      // Jika semua kunci gagal, lempar error
      throw new Error('Semua kunci API Gemini gagal.');
    };

    switch (type) {
      case 'text':
        result = await tryApiCall(async (key) => {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
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
          if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
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
          if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
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

    // Mengirim hasil kembali ke frontend
    res.status(200).json(result);

  } catch (error) {
    // LOGGING: Catat error final jika semua usaha gagal
    console.error('Gagal memproses permintaan setelah mencoba semua kunci:', error);
    res.status(500).json({ error: 'Terjadi gangguan di pihak server.' });
  }
}

