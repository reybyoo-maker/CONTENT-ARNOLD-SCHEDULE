# Arnold Bolang — Content Planner (Google Sheets + Apps Script + Gemini)

Automation ini berjalan langsung dari Google Sheets. Yang diperlukan hanya **Gemini API key dari Google AI Studio** dan Apps Script yang terikat pada spreadsheet. Tidak perlu Service Account, Google Sheets API setup terpisah, GitHub Actions untuk menjalankan job, server, atau instal aplikasi.

## Fitur
- Membuat **1–3 post per hari**, pada jam yang berbeda.
- Frekuensi format diatur otomatis: **tepat 1 Reels per kalender 7 hari**. Semua slot lain hanya Carousel atau Feed single-image.
- Draft diminta ke Gemini dalam **batch maksimal 3 konten**, supaya output tidak terlalu panjang. Jika jumlah post kurang atau output gagal, script mencoba ulang batch; jika masih gagal, script memecahnya menjadi permintaan satu konten. Seluruh jumlah post dicek sebelum menulis kalender.
- Struktur output diperiksa per batch. Jika ID contoh konten tidak cocok dengan format slot, script menggantinya dengan contoh eksternal yang sesuai; field slide Carousel dikosongkan otomatis untuk format Reels/Feed; Carousel yang tidak memiliki tepat 7 slide akan diminta ulang, lalu dipecah menjadi permintaan individual bila perlu.
- Slot jam WIB dipilih dari 09.00, 12.15, 15.30, 18.45, dan 20.30.
- Jumlah dan jam per tanggal stabil ketika dijalankan ulang; format yang terjadwal juga deterministik, sehingga satu minggu tidak mendapat lebih dari satu Reels.
- Kalender awal dimulai 21 Oktober 2026.
- **Hook wajib 4–9 kata** untuk Reels, Carousel, dan Feed. Script memvalidasi jumlah kata sebelum menulis baris konten ke kalender.
- Carousel menghasilkan **7 slide lengkap**. Setiap slide berisi kalimat siap-pakai untuk desain, role slide, dan arahan visual—bukan hanya daftar ide/outline. Slide 1 sama persis dengan hook; slide 7 berisi CTA.
- Caption Bahasa Indonesia, CTA, hashtag, rencana produksi Reels, sumber riset, dan contoh konten publik dimasukkan ke kalender.
- Fokus editorial minimal **80% pada leadership, people management, team performance, delegation, komunikasi, emotional intelligence, supervisor/manager, dan situasi kerja nyata**. Konten AI bersifat opsional dan maksimal satu post per batch mingguan.
- Referensi riset dan contoh konten berasal dari **sumber eksternal**, bukan dari profil, post, atau aktivitas pemilik akun. Riset leadership berasal dari penerbit profesional dan penelitian tempat kerja. Contoh format publik mencakup [TED Talk tentang rasa aman dalam kepemimpinan](https://www.ted.com/talks/simon_sinek_why_good_leaders_make_you_feel_safe), [carousel tentang delegasi dan akuntabilitas](https://www.linkedin.com/posts/jeff-hancher_leadership-delegation-accountability-activity-7498344771346886656-0os7), serta contoh feed statis dari [Center for Creative Leadership](https://www.linkedin.com/posts/center-for-creative-leadership_how-to-give-the-most-effective-feedback-activity-7272269336101199872-0D1N) dan [Gallup](https://www.linkedin.com/posts/gallup_manager-engagement-has-dropped-nine-points-activity-7449818929213911041-b3b0).
- **Sumber contoh konten dikunci berdasarkan tipenya:** video hanya untuk Reels; carousel hanya untuk Carousel; dan post statis/satu gambar hanya untuk Feed. Artikel atau profil hanya dapat dipakai sebagai referensi riset, bukan sebagai contoh format.
- **Referensi contoh konten wajib cocok dengan formatnya.** Slot Reels hanya menerima referensi video, slot Carousel hanya menerima sumber yang teridentifikasi sebagai carousel, dan slot Feed hanya menerima post feed statis/satu gambar. Link artikel, profil, dan post yang format visualnya belum terverifikasi tetap disimpan sebagai sumber konteks, tetapi tidak bisa dipilih sebagai referensi format.
- Kolom Creator Example Format Match di kalender dan Best Format Match di tab Creator Examples menunjukkan tipe referensi yang dipilih. Format diputuskan dari metadata sumber yang terverifikasi—bukan ditebak dari judul.
- Setiap post harus memiliki riset referensi yang valid dan situasi kerja. Kasus nyata hanya boleh digunakan ketika sumber publik mendukung detailnya; jika tidak, contoh harus diberi label **SIMULASI SITUASI LAPANGAN**, bukan disajikan sebagai kejadian nyata.
- Tidak mengarang URL, statistik, testimoni, hasil klien, atau pengalaman pribadi siapa pun. Setup menghapus referensi profil/post pemilik akun yang tertinggal dari versi lama di tab Reference Library dan Creator Examples. Draft kalender historis tidak diubah otomatis. Jika hook, kasus/skenario, referensi, atau struktur carousel tidak memenuhi aturan, proses dihentikan sebelum baris draft kalender ditulis.
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

**Jika kamu sudah pernah memasang versi kode lama:** tempel versi terbaru dari `apps-script/Code.gs`, klik Save, refresh spreadsheet, lalu jalankan menu **1. Setup API key + spreadsheet automation** sekali lagi. Setup menambahkan kolom format referensi, memperbarui daftar contoh eksternal, dan membersihkan sumber dari profil/post pemilik akun yang tertinggal pada tab Reference Library dan Creator Examples. Draft lama di Content Calendar tidak dihapus atau diubah otomatis; aturan referensi eksternal dan pencocokan format berlaku untuk draft baru.

## Tab spreadsheet yang dibuat
- **Content Calendar** — jadwal, format, hook, rencana produksi, caption, CTA, hashtag, sumber riset, contoh yang sesuai tipe konten, kolom Creator Example Format Match, catatan verifikasi kasus/skenario, dan kolom **Carousel Slide Copy (per slide)**. Slide carousel ditulis berurutan dalam satu sel, dipisahkan per slide.
- **Reference Library** — artikel/riset publik yang ditemukan oleh pencarian mingguan.
- **Creator Examples** — contoh sumber publik dengan tautan dan metadata Best Format Match. Hanya contoh dengan tipe yang sudah diverifikasi yang dapat dipilih untuk format bersangkutan; sumber konteks umum tidak akan dipakai sebagai pengganti referensi video/carousel/feed.

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
- **Jumlah output Gemini kurang:** versi terbaru mencoba ulang, lalu mengirim slot satu per satu jika perlu. Kalau masih gagal, periksa Apps Script → Executions dan kuota API Gemini.
- **Sumber kurang:** coba lagi nanti; script sengaja tidak membuat referensi palsu.
- **Header berbeda:** gunakan spreadsheet baru yang kosong atau ubah nama tab lama. Script tidak menghapus data lama otomatis.
- Lihat **Apps Script → Executions** untuk detail error.
