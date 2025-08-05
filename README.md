# Edlink Scraper API

API untuk melakukan scraping data mata kuliah dan kelompok dari platform Edlink menggunakan Express.js, Prisma ORM dengan MySQL database, dan Puppeteer untuk web scraping.

## 🚀 Features

- 🔐 **Automated Login** - Login otomatis ke platform Edlink
- 📅 **Semester Selection** - Pemilihan semester berdasarkan input pengguna
- 📚 **Course Scraping** - Scraping data mata kuliah secara otomatis
- 👥 **Group & Members** - Scraping data kelompok dan anggota kelompok
- 💾 **MySQL Database** - Penyimpanan data menggunakan MySQL dengan Prisma ORM
- 🚀 **RESTful API** - API endpoints yang lengkap dan terstruktur
- 🛡️ **Security** - Rate limiting, CORS, Helmet, dan validasi input
- ✅ **Input Validation** - Validasi data menggunakan express-validator
- 🔄 **Real-time Scraping** - Scraping data real-time berdasarkan request

## 📋 Prerequisites

- **Node.js** (v18 atau lebih tinggi)
- **MySQL Database** (v8.0 atau lebih tinggi)
- **npm** atau **yarn** package manager
- **Git** untuk cloning repository

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd edlink-scrap
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Buat file `.env` di root directory:
```env
# Database Configuration
DATABASE_URL="mysql://username:password@localhost:3306/edlink_scraper"

# Server Configuration
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-super-secret-jwt-key
API_RATE_LIMIT=100

# Edlink Credentials (Optional - bisa diinput via API)
EMAIL=your-email@example.com
PASSWORD=your-password
```

### 4. Setup MySQL Database
```bash
# Buat database MySQL
mysql -u root -p
CREATE DATABASE edlink_scraper;
EXIT;
```

### 5. Setup Prisma
```bash
# Generate Prisma client
npm run db:generate

# Push schema ke database
npm run db:push
```

## 🚀 Usage

### Menjalankan Server
```bash
# Production mode
npm start

# Development mode (dengan auto-reload)
npm run dev

# Server akan berjalan di http://localhost:3000
```

### Menjalankan Scraper Standalone (Legacy)
```bash
# Untuk testing scraper secara langsung
npm run scrape
```

### Health Check
Setelah server berjalan, test dengan:
```bash
curl http://localhost:3000/health
```

## 📡 API Endpoints

### Health Check
**Endpoint:** `GET /health`

**Deskripsi:** Mengecek status server

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 🔄 Start Scraping Process
**Endpoint:** `POST /api/scrape`

**Deskripsi:** Memulai proses scraping data mata kuliah dan kelompok

**Request Body:**
```json
{
  "email": "your-email@example.com",
  "password": "your-password",
  "semester": "2024 Ganjil"
}
```

**Validasi:**
- `email`: Harus format email yang valid
- `password`: Wajib diisi
- `semester`: Wajib diisi (contoh: "2024 Ganjil", "2024 Genap")

**Response Success:**
```json
{
  "success": true,
  "message": "Scraping completed successfully",
  "data": {
    "semester": "2024 Ganjil",
    "coursesCount": 2,
    "courses": [
      {
        "id": 1,
        "kode": "868166",
        "nama": "Teknologi Informasi dan Komunikasi",
        "semester": "2024 Ganjil",
        "groups": [...]
      }
    ]
  }
}
```

**Response Error:**
```json
{
  "success": false,
  "error": "Scraping failed",
  "message": "Login failed or network error"
}
```

### 📚 Get All Courses
**Endpoint:** `GET /api/courses`

**Deskripsi:** Mengambil semua data mata kuliah

**Query Parameters (Optional):**
- `semester`: Filter berdasarkan semester (contoh: `?semester=2024%20Ganjil`)

**Examples:**
```bash
# Semua mata kuliah
GET /api/courses

# Filter berdasarkan semester
GET /api/courses?semester=2024%20Ganjil
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "kode": "868166",
      "nama": "Teknologi Informasi dan Komunikasi",
      "semester": "2024 Ganjil",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "groups": [
        {
          "id": 1,
          "nama": "Kelompok 1",
          "courseId": 1,
          "members": [
            {
              "id": 1,
              "nama": "John Doe",
              "peran": "Ketua",
              "groupId": 1
            }
          ]
        }
      ]
    }
  ],
  "count": 1
}
```

### 📖 Get Specific Course
**Endpoint:** `GET /api/courses/:id`

**Deskripsi:** Mengambil detail mata kuliah berdasarkan ID

**Parameters:**
- `id`: ID mata kuliah (integer)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "kode": "868166",
    "nama": "Teknologi Informasi dan Komunikasi",
    "semester": "2024 Ganjil",
    "groups": [...]
  }
}
```

### 👥 Get Groups for a Course
**Endpoint:** `GET /api/courses/:id/groups`

**Deskripsi:** Mengambil semua kelompok dalam mata kuliah tertentu

**Parameters:**
- `id`: ID mata kuliah (integer)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nama": "Kelompok 1",
      "courseId": 1,
      "course": {
        "id": 1,
        "kode": "868166",
        "nama": "Teknologi Informasi dan Komunikasi",
        "semester": "2024 Ganjil"
      },
      "members": [...]
    }
  ],
  "count": 1
}
```

### 🧑‍🤝‍🧑 Get Members for a Group
**Endpoint:** `GET /api/groups/:id/members`

**Deskripsi:** Mengambil semua anggota dalam kelompok tertentu

**Parameters:**
- `id`: ID kelompok (integer)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nama": "John Doe",
      "peran": "Ketua",
      "groupId": 1,
      "group": {
        "id": 1,
        "nama": "Kelompok 1",
        "course": {
          "id": 1,
          "kode": "868166",
          "nama": "Teknologi Informasi dan Komunikasi",
          "semester": "2024 Ganjil"
        }
      }
    }
  ],
  "count": 1
}
```

### 🗑️ Delete Course
**Endpoint:** `DELETE /api/courses/:id`

**Deskripsi:** Menghapus mata kuliah dan semua data terkait (groups & members)

**Parameters:**
- `id`: ID mata kuliah (integer)

**Response:**
```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

## 🗄️ Database Schema

Proyek ini menggunakan **MySQL** sebagai database dengan **Prisma ORM** untuk manajemen data.

### 📚 Table: `courses`
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | INT | Primary Key | AUTO_INCREMENT |
| `kode` | VARCHAR | Kode mata kuliah | UNIQUE, NOT NULL |
| `nama` | VARCHAR | Nama mata kuliah | NOT NULL |
| `semester` | VARCHAR | Semester (contoh: "2024 Ganjil") | NOT NULL |
| `createdAt` | DATETIME | Waktu dibuat | DEFAULT NOW() |
| `updatedAt` | DATETIME | Waktu diupdate | ON UPDATE NOW() |

### 👥 Table: `groups`
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | INT | Primary Key | AUTO_INCREMENT |
| `nama` | VARCHAR | Nama kelompok | NOT NULL |
| `courseId` | INT | Foreign Key ke courses | NOT NULL |
| `createdAt` | DATETIME | Waktu dibuat | DEFAULT NOW() |
| `updatedAt` | DATETIME | Waktu diupdate | ON UPDATE NOW() |

**Constraints:**
- `UNIQUE(courseId, nama)` - Nama kelompok unik per mata kuliah
- `ON DELETE CASCADE` - Hapus groups jika course dihapus

### 🧑‍🤝‍🧑 Table: `members`
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | INT | Primary Key | AUTO_INCREMENT |
| `nama` | VARCHAR | Nama anggota | NOT NULL |
| `peran` | VARCHAR | Peran (Ketua, Anggota, dll) | NOT NULL |
| `groupId` | INT | Foreign Key ke groups | NOT NULL |
| `createdAt` | DATETIME | Waktu dibuat | DEFAULT NOW() |
| `updatedAt` | DATETIME | Waktu diupdate | ON UPDATE NOW() |

**Constraints:**
- `ON DELETE CASCADE` - Hapus members jika group dihapus

### 🔗 Relationships
```
Courses (1) ──── (N) Groups (1) ──── (N) Members
```
- Satu **Course** bisa memiliki banyak **Groups**
- Satu **Group** bisa memiliki banyak **Members**

## ⚠️ Error Handling

Semua API endpoints mengembalikan response error yang konsisten:

### Format Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

### HTTP Status Codes
| Code | Status | Description |
|------|--------|-------------|
| `200` | ✅ Success | Request berhasil |
| `400` | ❌ Bad Request | Validation error atau request tidak valid |
| `404` | 🔍 Not Found | Resource tidak ditemukan |
| `429` | 🚫 Too Many Requests | Rate limit terlampaui |
| `500` | 💥 Internal Server Error | Error server internal |

### Contoh Error Responses

**Validation Error (400):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    },
    {
      "field": "password",
      "message": "Password is required"
    }
  ]
}
```

**Not Found Error (404):**
```json
{
  "success": false,
  "error": "Course not found"
}
```

**Rate Limit Error (429):**
```json
{
  "success": false,
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again later."
}
```

## 🚦 Rate Limiting

API endpoints dibatasi untuk mencegah abuse:

- **Limit:** 100 requests per 15 menit per IP address
- **Headers:** Response akan menyertakan rate limit headers
- **Reset:** Counter akan reset setiap 15 menit

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```

## 🛡️ Security Features

- **Helmet.js** - Security headers untuk melindungi dari common attacks
- **CORS** - Cross-Origin Resource Sharing yang dikonfigurasi dengan aman
- **Input Validation** - Validasi input menggunakan express-validator
- **Rate Limiting** - Pembatasan request untuk mencegah abuse
- **Environment Variables** - Kredensial sensitif disimpan di .env
- **SQL Injection Protection** - Prisma ORM melindungi dari SQL injection
- **XSS Protection** - Helmet membantu mencegah XSS attacks

## 🔧 Development

### Project Structure
```
edlink-scrap/
├── 📁 lib/
│   └── prisma.js              # Prisma client instance
├── 📁 prisma/
│   ├── schema.prisma          # Database schema definition
│   └── dev.db                 # SQLite database (jika ada)
├── 📁 routes/
│   └── api.js                 # API routes dan endpoints
├── 📄 auth.js                 # Logic untuk login ke Edlink
├── 📄 config.js               # Konfigurasi aplikasi
├── 📄 groupScraper.js         # Scraper untuk data kelompok
├── 📄 index.js                # Standalone scraper (legacy)
├── 📄 scraper.js              # Scraper untuk data mata kuliah
├── 📄 scraperService.js       # Main service untuk scraping
├── 📄 semesterSelector.js     # Logic pemilihan semester
├── 📄 server.js               # Express server utama
├── 📄 test-server.js          # Server untuk testing
├── 📄 utils.js                # Utility functions
├── 📄 package.json            # Dependencies dan scripts
├── 📄 .env                    # Environment variables
├── 📄 .gitignore              # Git ignore rules
└── 📄 README.md               # Dokumentasi ini
```

### 📝 File Descriptions

| File | Description |
|------|-------------|
| `server.js` | **Main server** - Express app dengan middleware dan routes |
| `scraperService.js` | **Core scraper** - Orchestrates seluruh proses scraping |
| `auth.js` | **Authentication** - Handle login ke platform Edlink |
| `scraper.js` | **Course scraper** - Scraping data mata kuliah |
| `groupScraper.js` | **Group scraper** - Scraping data kelompok dan anggota |
| `semesterSelector.js` | **Semester selector** - Logic pemilihan semester |
| `routes/api.js` | **API routes** - Definisi semua endpoint API |
| `lib/prisma.js` | **Database client** - Prisma client instance |
| `utils.js` | **Utilities** - Helper functions |
| `config.js` | **Configuration** - App configuration |
| `index.js` | **Legacy scraper** - Standalone scraper (tidak digunakan di API) |

### 📜 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Production** | `npm start` | Menjalankan server production |
| **Development** | `npm run dev` | Menjalankan server development dengan auto-reload |
| **Legacy Scraper** | `npm run scrape` | Menjalankan standalone scraper (tidak menggunakan API) |
| **Database** | `npm run db:generate` | Generate Prisma client |
| **Database** | `npm run db:push` | Push schema ke database |
| **Database** | `npm run db:migrate` | Menjalankan database migrations |
| **Test** | `npm test` | Menjalankan tests (belum diimplementasi) |

### 🔄 Development Workflow

1. **Setup Development Environment:**
   ```bash
   npm run dev
   ```

2. **Test API dengan curl:**
   ```bash
   # Health check
   curl http://localhost:3000/health
   
   # Test scraping
   curl -X POST http://localhost:3000/api/scrape \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your-email@example.com",
       "password": "your-password",
       "semester": "2024 Ganjil"
     }'
   ```

3. **Monitor Database:**
   ```bash
   # Lihat data courses
   curl http://localhost:3000/api/courses
   
   # Lihat data dengan filter semester
   curl "http://localhost:3000/api/courses?semester=2024%20Ganjil"
   ```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Error
**Error:** `Error: P1001: Can't reach database server`

**Solutions:**
- Pastikan MySQL server berjalan
- Periksa kredensial database di `.env`
- Pastikan database `edlink_scraper` sudah dibuat

```bash
# Cek status MySQL
sudo systemctl status mysql

# Start MySQL jika belum berjalan
sudo systemctl start mysql

# Buat database
mysql -u root -p
CREATE DATABASE edlink_scraper;
```

#### 2. Prisma Client Error
**Error:** `PrismaClientInitializationError`

**Solutions:**
```bash
# Regenerate Prisma client
npm run db:generate

# Push schema ke database
npm run db:push
```

#### 3. Scraping Failed
**Error:** `Login failed or network error`

**Possible Causes:**
- Kredensial email/password salah
- Network timeout
- Edlink website berubah struktur
- Semester tidak ditemukan

**Solutions:**
- Verifikasi kredensial di browser
- Cek koneksi internet
- Periksa log error untuk detail

#### 4. Rate Limit Exceeded
**Error:** `Too many requests`

**Solutions:**
- Tunggu 15 menit untuk reset
- Atau restart server untuk reset counter

#### 5. Port Already in Use
**Error:** `EADDRINUSE: address already in use :::3000`

**Solutions:**
```bash
# Cari process yang menggunakan port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Atau gunakan port lain di .env
PORT=3001
```

### 📊 Monitoring & Debugging

#### Enable Debug Mode
```bash
# Set NODE_ENV ke development untuk lebih banyak log
NODE_ENV=development npm run dev
```

#### Check Database Content
```bash
# Connect ke MySQL
mysql -u username -p edlink_scraper

# Lihat tables
SHOW TABLES;

# Lihat data courses
SELECT * FROM courses;
```

#### API Testing dengan Postman
Import collection berikut ke Postman:
```json
{
  "info": {
    "name": "Edlink Scraper API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{base_url}}/health",
          "host": ["{{base_url}}"],
          "path": ["health"]
        }
      }
    },
    {
      "name": "Start Scraping",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"your-email@example.com\",\n  \"password\": \"your-password\",\n  \"semester\": \"2024 Ganjil\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/scrape",
          "host": ["{{base_url}}"],
          "path": ["api", "scrape"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    }
  ]
}
```

## 🤝 Contributing

1. **Fork** repository ini
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** perubahan (`git commit -m 'Add amazing feature'`)
4. **Push** ke branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

### Development Guidelines
- Gunakan ESM modules (import/export)
- Follow existing code style
- Add error handling untuk semua async operations
- Update dokumentasi jika diperlukan

## 📄 License

**ISC License** - Lihat file LICENSE untuk detail lengkap.

---

## 📞 Support

Jika mengalami masalah atau butuh bantuan:

1. **Check** bagian Troubleshooting di atas
2. **Search** existing issues di repository
3. **Create** new issue dengan detail error dan langkah reproduksi
4. **Include** log error dan environment information

**Happy Scraping! 🚀**