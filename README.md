# MOTHRA CLAN — Official Point Blank Esports Website

Website resmi Clan **MOTHRA** Point Blank Indonesia (Est. 2020 • Jakarta).

---

## 🚀 1. Cara Menjalankan Website (URL Bersih Tanpa Terlihat Lokasi Folder)

Agar di browser **TIDAK MUNCUL** tulisan `file:///D:/WebsiteMothra/index.html`:

1. **Cukup klik 2x file:**
   ```
   d:\WebsiteMothra\start-server.bat
   ```
2. Browser akan otomatis terbuka di alamat:
   ```
   http://localhost:3000
   ```
   *(Alamat folder komputer kamu terlindungi & tidak kelihatan sama sekali!)*

---

## 🔒 2. Proteksi Keamanan & Anti-Hack yang Diterapkan

Website ini telah dilengkapi sistem perlindungan berlapis:

| Fitur Proteksi | Fungsi |
|---|---|
| **Content Security Policy (CSP)** | Mencegah XSS (Cross-Site Scripting) & injeksi script berbahaya |
| **X-Frame-Options: SAMEORIGIN** | Mencegah Clickjacking & website di-embed/dicuri orang lain |
| **X-Content-Type-Options: nosniff** | Melindungi dari eksploitasi MIME type |
| **Anti-Honeypot Bot Trap** | Menangkap & memblokir bot spam pendaftaran secara instan |
| **Rate Limiter / Cooldown (15 Menit)** | Mencegah spam formulir berulang dari pengirim yang sama |
| **Input Sanitizer** | Membersihkan karakter tag HTML pada input form |
| **Anti-Asset Drag** | Mencegah pencurian aset gambar clan |

---

## 🌐 3. Cara Onlinekan / Hosting Gratis

### Opsi A: Netlify Drop (Paling Mudah — 10 Detik)
1. Buka [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag & drop seluruh folder `WebsiteMothra` ke browser
3. Website langsung aktif online dengan HTTPS & konfigurasi keamanan `netlify.toml` otomatis aktif!

### Opsi B: Vercel (Gratis & Cepat)
1. Push project ke GitHub
2. Import repository di [vercel.com](https://vercel.com)
3. Proteksi `vercel.json` akan otomatis terpasang.

---

## 📁 Struktur File

```
WebsiteMothra/
├── index.html        # Struktur halaman utama (Point Blank Edition)
├── style.css         # Styling modern esports & layout responsif
├── main.js           # Interaktivitas, dossier modal, background parallax & firewall
├── server.js         # Local web server dengan security headers
├── start-server.bat  # 1-Klik jalan di http://localhost:3000
├── netlify.toml      # Konfigurasi keamanan hosting Netlify
├── vercel.json       # Konfigurasi keamanan hosting Vercel
└── assets/           # Wallpaper Point Blank, Logo MOTHRA, & Foto Pemain
    ├── mothra-logo.png
    ├── pb-bg-elite.jpg
    ├── pb-bg-squad.jpg
    ├── pb-bg-duo.jpg
    └── ...
```

---
© 2024 MOTHRA COMPANY — NO FEAR. NO EXCUSES.
