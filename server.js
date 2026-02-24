require('dotenv').config();
const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const Groq = require('groq-sdk');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(__dirname));

// AMAN: Menggunakan API Key dari environment variable
const groq = new Groq({ 
    apiKey: process.env.GROQ_API_KEY 
});

    app.post('/analyze', upload.single('image'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).send('Fotonya mana, Pak?');

            const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'ind');
            
            const completion = await groq.chat.completions.create({
                messages: [
                    { 
                        role: "system", 
                        content: `Anda adalah pakar investigasi siber anti-fraud Indonesia. 
                        Tugas Anda adalah menganalisis teks dari screenshot chat untuk mendeteksi penipuan.
                        
                        KRITERIA RISIKO TINGGI (SKOR 90-100):
                        1. Chat mengaku dari kurir (Shopee, J&T, dll) atau CS Bank yang meminta screenshot rincian pesanan, profil akun, atau menu aplikasi.
                        2. Menggunakan alasan "paket tertunda", "alamat tidak lengkap", atau "masalah sistem" untuk meminta data pribadi.
                        3. Meminta korban melakukan tindakan di luar aplikasi resmi (seperti mengirim screenshot data sensitif via WA).
                        4. Menggunakan bahasa yang seolah sopan ("kakak", "SOP") tapi tujuannya memanipulasi.

                        Jika teks mengandung kata seperti "rincian pesanan", "screenshot menu", "sop nya ya kakak", dan dikirim dari nomor tidak resmi, BERIKAN SKOR MINIMAL 95.

                        Output harus JSON murni: 
                        {
                        "skor_risiko": (angka 0-100),
                        "status": "Aman/Waspada/Bahaya",
                        "alasan": "Jelaskan mengapa ini penipuan, sebutkan pola manipulasinya",
                        "anjuran": "Langkah konkret untuk user"
                        }` 
                    },
                    { role: "user", content: `Analisis teks hasil OCR ini: ${text}` }
                ],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" }
            }); 
                
            res.json(JSON.parse(completion.choices[0].message.content));

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/analyze-link', async (req, res) => {
        try {
            const { url } = req.body;
            if (!url) return res.status(400).json({ error: "Link kosong, Pak!" });

            console.log("Menganalisis link:", url);

            const completion = await groq.chat.completions.create({
                messages: [
                    { 
                        role: "system", 
                        content: "Anda pakar Cyber Security. Analisis URL. Jika domain aneh (.xyz, .top, .com-update) meniru bank (BCA, Mandiri, dll), berikan SKOR 90+. Output JSON murni: skor_risiko (angka), status, alasan, anjuran." 
                    },
                    { role: "user", content: `Analisis link ini: ${url}` }
                ],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" }
            });

            res.json(JSON.parse(completion.choices[0].message.content));
        } catch (error) {
            console.error("Error Link:", error);
            res.status(500).json({ error: "Server gagal bedah link" });
        }
    });

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server CekScam AI Running di Port ${PORT}, Pak!`);
});