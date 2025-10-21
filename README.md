Msg from Oracle (Vercel Deployment)

Ini adalah proyek web "Msg from Oracle" yang siap untuk di-deploy menggunakan Vercel.

Struktur Proyek

index.html: File utama antarmuka pengguna (frontend).

api/generate.js: Serverless Function yang akan dijalankan oleh Vercel sebagai backend. File ini mengelola semua panggilan ke API eksternal (Gemini dan VoiceRSS) secara aman.

package.json: Konfigurasi dasar proyek.

README.md: Panduan ini.

Cara Deploy ke Vercel

Unggah ke GitHub:

Pastikan Anda sudah memiliki akun GitHub.

Buat repositori baru di GitHub.

Unggah semua file dari proyek ini (index.html, package.json, README.md, dan folder api beserta isinya) ke repositori tersebut.

Hubungkan ke Vercel:

Buka Vercel dan login (bisa menggunakan akun GitHub Anda).

Klik "Add New..." -> "Project".

Pilih repositori GitHub yang baru saja Anda buat. Vercel akan otomatis mendeteksinya sebagai proyek statis dengan Serverless Functions.

Biarkan semua pengaturan default dan klik "Deploy".

Tambahkan Environment Variables (SANGAT PENTING):

Setelah proyek berhasil di-deploy, buka dashboard proyek di Vercel.

Masuk ke tab "Settings" -> "Environment Variables".

Tambahkan variabel berikut satu per satu:

GEMINI_API_KEYS:

Key: GEMINI_API_KEYS

Value: Masukkan semua kunci API Gemini Anda, dipisahkan dengan koma (tanpa spasi).

Contoh Value: AIzaSy...zc8,AIzaSy...voQ,AIzaSy...os8

VOICERSS_API_KEY:

Key: VOICERSS_API_KEY

Value: Masukkan kunci API VoiceRSS Anda.

Contoh Value: 2bca63c883a0455cbdba6a251782cb9f

Pastikan untuk TIDAK mencentang kotak "Encrypt". Vercel akan menanganinya secara aman.

Redeploy:

Setelah menyimpan environment variables, Vercel akan meminta Anda untuk melakukan redeploy (deploy ulang) agar perubahan diterapkan.

Buka tab "Deployments", pilih deployment terakhir, klik menu titik tiga (...) dan pilih "Redeploy".

Selesai!

Kunjungi domain Vercel Anda untuk melihat aplikasi berjalan dengan kunci API yang aman.
