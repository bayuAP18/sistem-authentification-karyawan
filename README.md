# 🔐 WebAuthn Fingerprint – Real Implementation

Implementasi WebAuthn/Passkey **nyata** menggunakan standar W3C WebAuthn.  
Fingerprint (atau Windows Hello / Face ID / Touch ID) didaftarkan & diverifikasi lewat hardware authenticator bawaan perangkat.

## Stack
| Komponen | Teknologi |
|---|---|
| Backend | Node.js + Express |
| WebAuthn Server Library | `@simplewebauthn/server` v9 |
| WebAuthn Browser Library | `@simplewebauthn/browser` v9 (CDN) |
| Database | SQLite via `better-sqlite3` |
| Session | `express-session` |

## Cara Menjalankan

### 1. Install dependencies
```bash
npm install
```

### 2. Jalankan server
```bash
npm start
# atau untuk development (auto-reload):
npm run dev
```

### 3. Buka browser
```
http://localhost:3000
```

## Alur Kerja

### Registrasi Fingerprint
```
Browser → POST /auth/register/begin  → Server membuat challenge
Server  → kirim WebAuthn options     → Browser
Browser → tampilkan dialog BIOMETRIK (Windows Hello/Touch ID/dll)
Pengguna → sentuh fingerprint sensor (ASLI)
Browser → POST /auth/register/complete → Server
Server  → verifikasi crypto + simpan public key ke DB
```

### Login dengan Fingerprint
```
Browser → POST /auth/login/begin  → Server membuat challenge baru
Server  → kirim challenge         → Browser
Browser → tampilkan dialog BIOMETRIK
Pengguna → sentuh fingerprint (ASLI)
Browser → POST /auth/login/complete → Server
Server  → verifikasi signature dengan public key yang tersimpan
```

## Keamanan
- Private key **tidak pernah meninggalkan perangkat pengguna** (disimpan di TPM/Secure Enclave)
- Server hanya menyimpan **public key**
- Setiap autentikasi menggunakan **challenge unik** (anti-replay attack)
- Counter diperbarui setiap login untuk mendeteksi kloning authenticator
- `userVerification: 'required'` → biometrik/PIN WAJIB

## Syarat Browser & Perangkat
- Chrome 67+ / Edge 79+ / Safari 14+ / Firefox 60+
- Perangkat dengan sensor fingerprint / Windows Hello / Face ID / Touch ID
- **HTTPS diperlukan di production** (localhost boleh HTTP)

## Production Checklist
- [ ] Ganti `RP_ID` dan `ORIGIN` di `server.js` sesuai domain
- [ ] Gunakan HTTPS (wajib untuk WebAuthn di production)
- [ ] Ganti session secret dengan nilai acak yang kuat
- [ ] Gunakan database proper (PostgreSQL, MySQL, dsb.)
- [ ] Tambahkan rate limiting
