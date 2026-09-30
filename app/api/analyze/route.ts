import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Daftar model fallback (jika model pertama sibuk, otomatis coba model berikutnya)
const MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
];

const MAX_RETRIES = 2;

async function callGemini(model: string, imagesBase64: string[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const imageParts = imagesBase64.map((base64) => ({
    inline_data: {
      mime_type: 'image/jpeg',
      data: base64
    }
  }));

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `Kamu adalah juri profesional dalam kontes modifikasi motor. Analisis gambar-gambar motor modifikasi ini dari berbagai sudut.

Nilai setiap aspek berikut dari 1-10:
1. Desain keseluruhan
2. Keserasian warna
3. Ban, Velg, Warna Velg
4. Ketinggian Motor, Stang, Rangka, Swing Arm, Shock Depan dan Belakang

PENTING: Balas HANYA dalam format JSON berikut, tanpa teks tambahan apapun:
{
  "rating": <skor rata-rata keseluruhan dari 1-10>,
  "desain": <skor 1-10>,
  "warna": <skor 1-10>,
  "kakiKaki": <skor 1-10>,
  "struktur": <skor 1-10>,
  "komentar": "<komentar singkat 1-2 kalimat sebagai juri setelah melihat seluruh sudut>"
}`
          },
          ...imageParts
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  return response;
}

export async function POST(req: Request) {
  try {
    const { imagesBase64 } = await req.json();

    if (!imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length === 0) {
      return NextResponse.json(
        { error: 'Setidaknya satu gambar diperlukan dalam format Base64' },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY belum dikonfigurasi. Dapatkan API key gratis di https://aistudio.google.com/apikey' },
        { status: 500 }
      );
    }

    // Bersihkan prefix data URL dari semua base64
    const cleanImages = imagesBase64.map((b: string) => b.replace(/^data:image\/\w+;base64,/, ''));

    // Coba setiap model dengan retry
    for (const model of MODELS) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await callGemini(model, cleanImages);
          const data = await response.json();

          // Jika berhasil, return hasilnya
          if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            return NextResponse.json({
              result: data.candidates[0].content.parts[0].text,
              status: true
            });
          }

          // Jika 503 (server sibuk), tunggu sebentar lalu retry
          if (data.error?.code === 503) {
            console.log(`Model ${model} sibuk (attempt ${attempt + 1}), menunggu...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
            continue;
          }

          // Jika 404 (model tidak ada), langsung coba model berikutnya
          if (data.error?.code === 404) {
            console.log(`Model ${model} tidak tersedia, mencoba model lain...`);
            break;
          }

          // Error lain, coba model berikutnya
          console.log(`Model ${model} error: ${data.error?.message}`);
          break;

        } catch (fetchError) {
          console.log(`Fetch error untuk ${model}:`, fetchError);
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          break;
        }
      }
    }

    return NextResponse.json(
      { error: 'Semua model sedang sibuk. Silakan coba lagi dalam beberapa saat.' },
      { status: 503 }
    );

  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json({ error: 'Gagal menganalisis gambar.' }, { status: 500 });
  }
}
