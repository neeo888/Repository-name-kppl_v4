#!/bin/zsh
# METERCare Project Manager - macOS Ultimate Production Fix

G='\033[0;32m'
R='\033[0;31m'
B='\033[0;34m'
Y='\033[1;33m'
NC='\033[0m'

# ตรวจสอบตำแหน่งโฟลเดอร์งาน
cd /Applications/XAMPP/xamppfiles/htdocs/wmts-project 2>/dev/null

case "$1" in
    fix-all)
        echo -e "${Y}🏗️  กำลังสร้างฟอร์มและเชื่อมโยงปุ่มทั้งหมด (Full Integration)...${NC}"
        mkdir -p pages includes assets/css uploads
        
        # 2.1 สร้างไฟล์เชื่อมต่อฐานข้อมูล (Port 3307/3306 Safe Mode)
        cat << 'EODB' > includes/db.php
<?php
mysqli_report(MYSQLI_REPORT_OFF);
$conn = @new mysqli('127.0.0.1', 'root', '', 'metercare_dev5', 3307);
if ($conn->connect_error) {
    $conn = @new mysqli('127.0.0.1', 'root', '', 'metercare_dev5', 3306);
}
if ($conn->connect_error) {
    die("Database Connection Error");
}
$conn->set_charset("utf8mb4");
?>
EODB

        # 2.2 สร้างไฟล์ Backend สำหรับบันทึกข้อมูล (save_report.php)
        cat << 'EOSAVE' > pages/save_report.php
<?php
require_once "../includes/db.php";
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $type = $_POST['report_type'] ?? 'ไม่ได้ระบุประเภท';
    $user = "คุณธนภัทร"; // ข้อมูลจำลองจากหน้า Dashboard
    $coords = $_POST['coordinates'] ?? '';
    $status = "pending";
    
    // บันทึกเข้าตาราง reports (รองรับคอลัมน์ type, reporter)
    $stmt = $conn->prepare("INSERT INTO reports (type, reporter, coordinates, status) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $type, $user, $coords, $status);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "บันทึก [$type] เรียบร้อยแล้ว"]);
    } else {
        echo json_encode(["status" => "error", "message" => "SQL Error: " . $conn->error]);
    }
    $stmt->close();
}
?>
EOSAVE

        # 2.3 สร้างเทมเพลตฟอร์มแจ้งเหตุพร้อมแผนที่ Leaflet (ทั้ง 8 ปุ่ม)
        declare -A forms
        forms=(
            ["report_leak.php"]="แจ้งท่อรั่ว/ท่อแตก"
            ["report_seal.php"]="แจ้งลวดตีตรามาตรขาด"
            ["report_remove.php"]="แจ้งยกมาตร"
            ["report_user_type.php"]="แจ้งเปลี่ยนประเภทผู้ใช้น้ำ"
            ["moonlight.php"]="MOONLIGHT SCANNER"
            ["report_usage.php"]="แจ้งน้ำสูง/ต่ำผิดปกติ"
            ["report_theft.php"]="แจ้งลักใช้น้ำ"
            ["report_defective.php"]="แจ้งมาตรชำรุด"
        )

        for file title in ${(kv)forms}; do
            cat << EOT > "pages/$file"
<?php session_start(); require_once "../includes/db.php"; ?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$title - METERCare</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        body{font-family:'Kanit',sans-serif;background:#f4f7f9;padding:20px;} 
        .form-card{background:white;padding:30px;border-radius:25px;box-shadow:0 10px 30px rgba(0,0,0,0.05);max-width:650px;margin:auto;} 
        #map{height:350px;border-radius:20px;margin-bottom:20px;border:4px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.1);}
        .btn-save{background:linear-gradient(135deg, #0d6efd 0%, #00c6ff 100%);border:none;border-radius:50px;padding:12px;font-weight:600;color:white;text-decoration:none;display:block;text-align:center;}
    </style>
</head>
<body>
    <div class="form-card shadow">
        <h4 class="text-primary fw-bold mb-4"><a href="index.php" class="text-decoration-none me-2">←</a> $title</h4>
        <p class="text-muted small">📍 คลิกบนแผนที่เพื่อระบุพิกัดที่เกิดเหตุ</p>
        <div id="map"></div>
        <form id="reportForm">
            <input type="hidden" name="report_type" value="$title">
            <div class="mb-3">
                <label class="form-label fw-bold">พิกัดที่เลือก</label>
                <input type="text" name="coordinates" id="coords" class="form-control bg-light" readonly required placeholder="โปรดปักหมุดบนแผนที่">
            </div>
            <button type="submit" class="btn btn-primary btn-save w-100 shadow">ยืนยันการส่งข้อมูล</button>
        </form>
    </div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        var map = L.map('map').setView([16.711, 98.571], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        var marker;
        map.on('click', function(e){
            var lat = e.latlng.lat.toFixed(6), lng = e.latlng.lng.toFixed(6);
            document.getElementById('coords').value = lat + ',' + lng;
            if(marker) marker.setLatLng(e.latlng); else marker = L.marker(e.latlng, {draggable:true}).addTo(map);
        });
        document.getElementById('reportForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const res = await fetch('save_report.php', { method: 'POST', body: formData });
            const data = await res.json();
            if(data.status === 'success') { alert('✨ ' + data.message); window.location.href='index.php'; }
            else { alert('❌ Error: ' + data.message); }
        };
    </script>
</body>
</html>
EOT
        done

        # 2.4 เชื่อมโยงปุ่มทั้ง 8 ในหน้า Dashboard (เปลี่ยน href="#" เป็นชื่อไฟล์จริง)
        TARGET="pages/index.php"
        if [ -f "$TARGET" ]; then
            echo -e "${BLUE}🔗 กำลังเชื่อมต่อลิงก์ในหน้า Dashboard...${NC}"
            sed -i '' 's/href="#" class="action-tile" style="background:var(--c1)"/href="report_leak.php" class="action-tile" style="background:var(--c1)"/g' "$TARGET"
            sed -i '' 's/href="#" class="action-tile" style="background:var(--c2)"/href="report_seal.php" class="action-tile" style="background:var(--c2)"/g' "$TARGET"
            sed -i '' 's/href="#" class="action-tile" style="background:var(--c3)"/href="report_remove.php" class="action-tile" style="background:var(--c3)"/g' "$TARGET"
            sed -i '' 's/href="#" class="action-tile" style="background:var(--c4)"/href="report_user_type.php" class="action-tile" style="background:var(--c4)"/g' "$TARGET"
            sed -i '' 's/href="#" class="action-tile" style="background:var(--c5)"/href="moonlight.php" class="action-tile" style="background:var(--c5)"/g' "$TARGET"
            sed -i '' 's/href="#" class="action-tile" style="background:var(--c6)"/href="report_usage.php" class="action-tile" style="background:var(--c6)"/g' "$TARGET"
            sed -i '' 's/href="#" class="action-tile" style="background:var(--c7)"/href="report_theft.php" class="action-tile" style="background:var(--c7)"/g' "$TARGET"
            sed -i '' 's/href="#" class="action-tile" style="background:var(--c8)"/href="report_defective.php" class="action-tile" style="background:var(--c8)"/g' "$TARGET"
            echo -e "${G}✅ เชื่อมโยงปุ่มแจ้งเหตุทั้ง 8 สำเร็จ!${NC}"
        fi
        
        chmod -R 755 .
        ;;

    check)
        echo -e "${BLUE}🔍 ตรวจสอบความพร้อม...${NC}"
        STATUS=$(php -r "include 'includes/db.php'; echo (isset(\$conn) && !\$conn->connect_error) ? 'OK' : 'FAIL';" 2>/dev/null)
        if [ "$STATUS" = "OK" ]; then
            echo -e "${G}[✓] Database Online (พอร์ต 3307/3306)${NC}"
            /Applications/XAMPP/xamppfiles/bin/mysql -u root -P 3307 -t -e "USE metercare_dev5; SELECT id, type, reporter, status, created_at FROM reports ORDER BY id DESC LIMIT 3;" 2>/dev/null
        else
            echo -e "${R}[X] Database Offline${NC}"
        fi
        ;;

    *) echo "Usage: $0 {fix-all|check}" ;;
esac
