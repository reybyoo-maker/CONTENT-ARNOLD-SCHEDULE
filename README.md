# Arnold Bolang — Weekly Content Planner

Workflow mingguan untuk kalender Instagram niche Arnold Bolang: leadership, team performance, delegation, komunikasi, emotional intelligence, workplace behavior, executive presence, dan produktivitas kerja.

Setiap minggu automation meneliti artikel/riset publik, lalu membuat 7 draft post (1 per hari) dengan format, jam WIB, hook, outline produksi, caption, CTA, hashtag, serta tautan referensi yang benar-benar ditemukan. Tautan referensi adalah artikel/riset untuk diperiksa, bukan klaim bahwa URL tersebut merupakan Reels Instagram. Konten harus diadaptasi menjadi sudut pandang orisinal, bukan disalin.

## Jadwal posting awal

| Hari | Jumlah | Format | Jam WIB |
|---|---:|---|---|
| Senin | 1 | Reels | 19.00 |
| Selasa | 1 | Carousel | 12.15 |
| Rabu | 1 | Reels | 19.00 |
| Kamis | 1 | Carousel | 12.15 |
| Jumat | 1 | Reels | 19.00 |
| Sabtu | 1 | Feed single-image | 10.00 |
| Minggu | 1 | Carousel | 19.00 |

Ini jadwal awal untuk diuji, bukan klaim jam terbaik. Evaluasi Instagram Insights setelah beberapa minggu (retensi, saves, shares, profile visits, dan inquiries).

## Setup sekali saja

### 1. Buat spreadsheet
Buat Google Spreadsheet misalnya **Arnold Bolang — Content Calendar**. Salin ID dari URL:
https://docs.google.com/spreadsheets/d/ID_SPREADSHEET/edit

Workflow membuat tiga tab otomatis: **Content Calendar**, **Reference Library**, dan **Creator Examples**.

### 2. Aktifkan Google Sheets API
Di Google Cloud Console, buat/pilih project, aktifkan Google Sheets API, buat Service Account, lalu buat JSON key. Buka file JSON dan ambil nilai client_email. Bagikan spreadsheet ke alamat client_email sebagai **Editor**. Jangan commit atau mempublikasikan JSON key.

### 3. Buat Gemini API key
Buka https://aistudio.google.com/apikey dan buat API key. Kuota gratis, rate limit, nama model, dan syarat layanan dapat berubah; periksa kuota di AI Studio. Workflow tidak memakai model berbayar kecuali kamu mengonfigurasi model/API key yang mengharuskannya.

### 4. Tambahkan GitHub Secrets
Di repo, buka **Settings → Secrets and variables → Actions → New repository secret**. Buat tiga secret:
- **GOOGLE_SHEET_ID** — ID spreadsheet.
- **GOOGLE_SERVICE_ACCOUNT_JSON** — seluruh isi JSON key Service Account.
- **GEMINI_API_KEY** — API key dari AI Studio.

Jangan taruh key di kode atau log. Model default adalah **gemini-3.5-flash-lite**. Jika tidak tersedia di akunmu, buat repository variable bernama **GEMINI_MODEL** dengan model stabil yang tersedia.

### 5. Jalankan pertama kali
1. Buka tab **Actions**.
2. Pilih **Weekly Arnold Content Planner**.
3. Klik **Run workflow**.
4. Untuk kalender pertama, isi start_date dengan **2026-10-21**.
5. Buka spreadsheet dan periksa kedua tab.

Jika tanggal itu sudah lewat saat setup dilakukan, masukkan tanggal mulai yang kamu inginkan. Tanggal yang sudah ada tidak akan ditambahkan ulang.

### 6. Jadwal otomatis
Workflow terjadwal setiap Rabu pukul **07.10 WIB** (00:10 UTC) dan membuat kalender 7 hari mulai tanggal lokal tersebut. Scheduled Actions berjalan pada default branch. GitHub dapat menonaktifkan workflow terjadwal pada repo publik yang tidak aktif 60 hari; aktifkan ulang dari tab Actions jika diperlukan.

## Alur research
Workflow menggunakan Google News RSS untuk mencari materi dari penerbit profesional, termasuk Harvard Business Review, Gallup, MIT Sloan Management Review, Center for Creative Leadership, SHRM, McKinsey, Atlassian, dan sumber relevan lain. Artikel ditemukan lebih dulu; Gemini hanya boleh menggunakan ID referensi yang diberikan. Jika sumber terlalu sedikit atau API gagal, workflow berhenti dengan error daripada membuat URL atau data palsu.

Kalender berisi tanggal, hari, jam WIB, jumlah per hari, format, pilar, topik, hook cover, outline/production plan, caption, CTA, hashtag, referensi riset 1 dan 2 beserta URL/ringkasan, satu contoh konten publik dari pihak lain beserta URL dan cara mengadaptasi formatnya, original angle, catatan fact-check, status, dan waktu pembuatan. Setiap post berstatus **DRAFT — REVIEW BEFORE POSTING**; review klaim dan caption sebelum menerbitkan.

## Troubleshooting
- **Permission denied:** bagikan Google Sheet ke client_email sebagai Editor.
- **Missing secret:** cek ejaan ketiga nama secret.
- **Gemini 400/403/429:** cek model, API key, region, dan kuota.
- **Referensi kurang:** coba lagi nanti; workflow sengaja menolak mengarang sumber.
- **Tanggal tidak bertambah:** tanggal yang sudah ada sengaja dilewati untuk mencegah duplikasi.
