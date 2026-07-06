# กปภ. พิษณุโลก — Dashboard v3 (MySQL Backend)

## ปัญหาที่แก้ไข
> ❌ เดิม: localStorage → เครื่องอื่นมองไม่เห็น  
> ✅ ใหม่: MySQL Server → ทุกเครื่องเห็นเหมือนกัน

## ขั้นตอนติดตั้ง

### 1. สร้าง MySQL Database (phpMyAdmin หรือ SSH)
```sql
CREATE DATABASE kppl_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kppl_user'@'localhost' IDENTIFIED BY 'StrongPass!';
GRANT ALL PRIVILEGES ON kppl_db.* TO 'kppl_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. แก้ api/config.php
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'kppl_db');
define('DB_USER', 'kppl_user');
define('DB_PASS', 'StrongPass!');
```

### 3. แก้ js/storage.js บรรทัดแรก
```js
const API_BASE = './api';
// ถ้าอยู่ใน subfolder: const API_BASE = '/kppl_v3/api';
```

### 4. Upload ไฟล์ทั้งหมดไปยัง public_html/

### 5. สร้างตาราง (รัน 1 ครั้ง)
```
https://yourdomain.com/api/init_db.php?token=121212
```

### 6. Import ข้อมูลเริ่มต้น (ไม่บังคับ)
```bash
mysql -u kppl_user -p kppl_db < sql/database.sql
```

### 7. ลบ init_db.php ออก (สำคัญมาก!)
```bash
rm api/init_db.php
```

## โครงสร้างไฟล์
```
kppl_v3/
├── index.html
├── .htaccess
├── api/
│   ├── config.php      ← แก้ DB ที่นี่
│   ├── init_db.php     ← รัน 1 ครั้ง แล้วลบทิ้ง
│   ├── save_rows.php   ← รับข้อมูลใหม่จาก browser
│   ├── load_rows.php   ← ส่งข้อมูลให้ browser
│   └── status.php      ← ตรวจสอบ DB
├── css/style.css
├── js/ (config→fiscal→charts→table→storage→ui→ai→fy_dashboard→app)
└── sql/database.sql
```

## Data Flow
```
เปิดเว็บ → load_rows.php → MySQL → Dashboard
นำเข้าไฟล์ → parse → save_rows.php → MySQL → ทุกเครื่องเห็น
Offline → localStorage → BUILTIN_DATA (490 records)
```
# -Repository-Repository-name-kppl_v3
