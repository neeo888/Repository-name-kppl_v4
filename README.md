# กปภ. พิษณุโลก — Dashboard v4

Dashboard สำหรับติดตามเอกสารงานซ่อมท่อ ใช้ PHP 8, MySQL และ server-side session authentication

## การตั้งค่า

1. ตั้ง environment variables ตาม `.env.example` ใน Apache/PHP-FPM หรือระบบ hosting
2. สร้างฐานข้อมูลและ user ที่มีสิทธิ์เฉพาะฐานข้อมูลนี้
3. เปิด `api/init_db.php?token=<KPPL_SETUP_SECRET>` เพียงครั้งเดียว
4. ลบหรือปิดการเข้าถึง `api/init_db.php` หลังติดตั้ง
5. ตั้งค่า `KPPL_ADMIN_*` ชั่วคราวแล้วสร้างหรือรีเซ็ต Admin คนแรก:

```bash
php scripts/create_admin.php
```

ลบ `KPPL_ADMIN_PASSWORD` ออกจาก environment หลังคำสั่งสำเร็จ ห้าม commit `.env`
หรือ credentials จริงเข้า Git และควรหมุนเปลี่ยน credentials เดิมทั้งหมดก่อน deploy

## Security model

- Login สร้าง PHP session cookie แบบ HttpOnly และ SameSite=Strict
- Backend เป็นผู้กำหนด role และขอบเขตข้อมูล
- `users.php`, import, status และ auto-sync ต้องเป็น Admin
- ผู้สมัครใหม่มีสถานะรออนุมัติโดยค่าเริ่มต้น
- Admin ดูรายชื่อและรีเซ็ตรหัสผ่านได้ แต่ API จะไม่ส่ง password hash ไปยัง browser
- Supabase browser adapter ถูกปิดเพื่อไม่ให้ข้าม authorization ของ PHP

## ตรวจสอบโค้ด

```bash
for f in api/*.php; do php -l "$f"; done
for f in js/*.js; do node --check "$f"; done
```
