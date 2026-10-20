# Arnold Bolang — Content Planner (Google Sheets + Apps Script + Gemini)

Automation ini berjalan langsung dari Google Sheets. Yang diperlukan hanya **Gemini API key dari Google AI Studio** dan Apps Script yang terikat pada spreadsheet. Tidak perlu Service Account, Google Sheets API setup terpisah, GitHub Actions untuk menjalankan job, server, atau instal aplikasi.

## Fitur
- Membuat **1–3 post per hari**, pada jam yang berbeda.
- Format bervariasi: Reels, Carousel, dan Feed single-image.
- Slot jam WIB dipilih dari 09.00, 12.15, 15.30, 18.45, dan 20.30.
- Jumlah, jam, dan format per tanggal stabil ketika dijalankan ulang sehingga slot tidak berubah dan tidak terduplikasi.
- Kalender awal dimulai 21 Oktober 2026.
- **Hook wajib 4–9 kata** untuk Reels, Carousel, dan Feed. Script memvalidasi jumlah kata sebelum menulis baris konten ke kalender.
- Carousel menghasilkan **7 slide lengkap**. Setiap slide berisi kalimat siap-pakai untuk desain, role slide, dan arahan visual—bukan hanya daftar ide/outline. Slide 1 sama persis dengan hook; slide 7 berisi CTA.
- Caption Bahasa Indonesia, CTA, hashtag, rencana produksi Reels, sumber riset, dan contoh konten publik dimasukkan ke kalender.
- Fokus editorial minimal **80% pada leadership, people management, team performance, delegation, komunikasi, emotional intelligence, supervisor/manager, dan situasi kerja nyata**. Konten AI bersifat opsional dan maksimal satu post per batch mingguan.
- Riset mencakup penerbit profesional/riset tepercaya serta pencarian khusus untuk personal brand Arnold. Referensi personal brand terkurasi menggunakan [profil LinkedIn Arnold](https://id.linkedin.com/in/arnold-priadi-bolang-70252a6b), [unggahan tentang Managing Change with Emotional Intelligence di Quipper](https://www.linkedin.com/posts/arnold-priadi-bolang-70252a6b_manajemenperubahan-kecerdasanemosional-activity-7306144835407597568-nuA7), [unggahan From Executor to Planner bersama United Tractors](https://www.linkedin.com/posts/arnold-priadi-bolang-70252a6b_peopledevelopment-leadership-pdca-activity-7341061749959233536-Svqx), dan contoh publik lain di tab Creator Examples.
- Setiap post harus memiliki riset referensi yang valid dan situasi kerja. Kasus nyata hanya boleh digunakan ketika sumber publik mendukung detailnya; jika tidak, contoh harus diberi label **SIMULASI SITUASI LAPANGAN**, bukan disajikan sebagai kejadian nyata.
- Tidak mengarang URL, statistik, testimoni, hasil klien, atau pengalaman pribadi Arnold. Jika hook, kasus/skenario, referensi, atau struktur carousel tidak memenuhi aturan, proses dihentikan sebelum baris draft kalender ditulis.
- Semua ide adalah draft berstatus **DRAFT — REVIEW BEFORE POSTING**. Script tidak memublikasikan ke Instagram.
- Model default adalah **gemini-3.5-flash-lite**. Jika model tidak tersedia pada akunmu, ganti konstanta MODEL di Code.gs dengan model stabil yang tersedia di AI Studio.

## Cara pasang — sekali saja
1. Buat spreadsheet di https://sheets.new dengan nama **Arnold Bolang — Content Calendar**.
2. Di spreadsheet, pilih **Extensions → Apps Script**.
3. Buka file **apps-script/Code.gs** di repository ini, salin seluruh isinya, tempel ke editor Apps Script, lalu klik **Save**.
4. Buat API key di https://aistudio.google.com/apikey.
5. Kembali ke spreadsheet dan refresh browser.
6. Dari menu **Arnold Content Planner**, pilih **1. Setup API key + spreadsheet automation**. Tempel API key saat diminta. Key disimpan di Script Properties, bukan di sel spreadsheet.
7. Setujui izin Google yang diminta untuk mengakses spreadsheet dan mengambil sumber dari internet.
8. Pilih **4. Test Gemini API key** untuk mengecek koneksi.
9. Pilih **2. Generate first week (21–27 Oct 2026)** untuk membuat jadwal dan draft awal.

**Jika kamu sudah pernah memasang versi kode lama:** tempel versi terbaru dari `apps-script/Code.gs`, klik Save, refresh spreadsheet, lalu jalankan menu **1. Setup API key + spreadsheet automation** sekali lagi. Setup menambahkan dua kolom baru tanpa menghapus kolom atau data lama. Draft yang sudah pernah dibuat tidak ditulis ulang otomatis; aturan hook/carousel baru berlaku untuk draft yang berhasil dibuat setelah versi ini terpasang.

## Tab spreadsheet yang dibuat
- **Content Calendar** — jadwal, format, hook, rencana produksi, caption, CTA, hashtag, sumber riset, contoh personal brand, catatan verifikasi kasus/skenario, dan kolom **Carousel Slide Copy (per slide)**. Slide carousel ditulis berurutan dalam satu sel, dipisahkan per slide.
- **Reference Library** — artikel/riset publik yang ditemukan oleh pencarian mingguan.
- **Creator Examples** — contoh konten publik terkurasi dengan tautan langsung dan catatan aspek format yang layak dipelajari.

## Jadwal otomatis
Setup membuat time-driven trigger setiap Rabu sekitar pukul **07.10 WIB**, lalu membuat kalender tujuh hari berikutnya. Trigger Apps Script berjalan dalam jendela waktu sekitar jam yang dipilih, tidak selalu tepat pada menit yang sama. Spreadsheet tidak perlu tetap terbuka.

Repository ini hanya menyimpan salinan source code dan dokumentasi. Eksekusi otomatis terjadi langsung dalam Apps Script milik akun Google yang memasang trigger.

## Biaya dan batasan
- Apps Script memakai kuota akun Google.
- Gemini API mempunyai kuota/rate limit dan ketentuan gratis atau berbayar yang dapat berubah. Pantau pemakaian di Google AI Studio.
- Jangan bagikan API key atau menaruhnya dalam kode publik.
- RSS memberi judul, publisher, tautan, dan cuplikan. Periksa sumber lengkap sebelum menerbitkan klaim faktual.
- Gemini bisa salah memahami cuplikan, jadi baca ulang draft sebelum posting.

## Troubleshooting
- **API key kosong:** jalankan Setup dari menu Arnold Content Planner.
- **HTTP 400/403/429:** cek API key, model yang tersedia, dan kuota di AI Studio.
- **Sumber kurang:** coba lagi nanti; script sengaja tidak membuat referensi palsu.
- **Header berbeda:** gunakan spreadsheet baru yang kosong atau ubah nama tab lama. Script tidak menghapus data lama otomatis.
- Lihat **Apps Script → Executions** untuk detail error.
