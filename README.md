# FISIOTA - ERM (Electronic Record Management)

Sistem Elektronik Rekam Medis untuk klinik fisioterapi berbasis web.

## Struktur Proyek

```
Fisiota/
├── Netlify/        → Frontend web app (HTML/CSS/JS) — deployed ke GitHub Pages
│   ├── index.html
│   ├── app.js
│   ├── assets.js
│   ├── data.js
│   ├── style.css
│   ├── config.js   → Konfigurasi URL Backend (GAS)
│   └── Booking/    → Halaman booking pasien
└── GAS/            → Google Apps Script (Backend di Google)
    ├── Main.gs.txt
    ├── Public.gs.txt
    ├── Notification.gs.txt
    ├── Sync.gs.txt
    ├── License.gs
    └── SaaS_Handler.gs
```

## Deploy

Frontend otomatis ter-deploy ke **GitHub Pages** via GitHub Actions setiap kali ada push ke branch `main`.

URL: `https://aalazuardy.github.io/ermfisio/`

## Konfigurasi

Edit file `Netlify/config.js` untuk mengatur:
- `LICENSE_API_URL` → URL Google Apps Script Web App
- `BOOKING_BASE_URL` → URL halaman booking (opsional)
