<?php session_start(); require_once "../includes/db.php"; ?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>แจ้งมาตรชำรุด - METERCare</title>
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
        <h4 class="text-primary fw-bold mb-4"><a href="index.php" class="text-decoration-none me-2">←</a> แจ้งมาตรชำรุด</h4>
        <p class="text-muted small">📍 คลิกบนแผนที่เพื่อระบุพิกัดที่เกิดเหตุ</p>
        <div id="map"></div>
        <form id="reportForm">
            <input type="hidden" name="report_type" value="แจ้งมาตรชำรุด">
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
