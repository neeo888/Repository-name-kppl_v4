<?php session_start(); require_once "../includes/db.php"; ?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8"><title>แจ้งท่อรั่ว/แตก - METERCare</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>body{font-family:'Kanit'; background:#f4f7f9;} .form-card{background:white; border-radius:25px; padding:30px; margin-top:30px; shadow:0 10px 30px rgba(0,0,0,0.05);} #map{height:350px; border-radius:15px; margin-bottom:20px; border:4px solid white; shadow:0 4px 12px rgba(0,0,0,0.1);}</style>
</head>
<body class="p-3">
    <div class="container" style="max-width: 600px;">
        <div class="form-card shadow">
            <h4 class="fw-bold text-primary mb-4"><a href="index.php" class="btn btn-light rounded-circle me-3">←</a> แจ้งท่อรั่ว/แตก</h4>
            <div id="map"></div>
            <form action="save_report.php" method="POST">
                <input type="hidden" name="report_type" value="แจ้งท่อรั่ว/ท่อแตก">
                <input type="hidden" name="status" value="Open">
                <div class="mb-3">
                    <label class="form-label fw-bold">พิกัดที่ระบุ (Lat, Lng)</label>
                    <input type="text" name="coordinates" id="coords" class="form-control bg-light" readonly required placeholder="โปรดคลิกบนแผนที่">
                </div>
                <button type="submit" class="btn btn-primary w-100 py-3 fw-bold rounded-pill shadow">ยืนยันและส่งข้อมูล</button>
            </form>
        </div>
    </div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        var map = L.map('map').setView([16.711, 98.571], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        var marker;
        map.on('click', function(e){
            document.getElementById('coords').value = e.latlng.lat.toFixed(6) + ', ' + e.latlng.lng.toFixed(6);
            if(marker) marker.setLatLng(e.latlng); else marker = L.marker(e.latlng, {draggable:true}).addTo(map);
        });
    </script>
</body>
</html>
