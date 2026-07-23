<?php session_start(); require_once "../includes/db.php"; ?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>หน้าแรก - METERCare Pro</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
    <link href="../assets/css/style.css" rel="stylesheet">
</head>
<body>
    <div class="app-shell">
        <div class="main-body">
            <?php include "../includes/sidebar.php"; ?>
            <div class="main-container" style="flex:1;">
                <?php include "../includes/topnavbar.php"; ?>
                <main>
                    <div class="hero-banner shadow">
                        <div>
                            <div class="fs-5 fw-light">กปภ.เขต 10 ✨</div>
                            <h2 class="display-6 fw-bold">สวัสดีครับ, คุณธนภัทร! 👋</h2>
                            <div class="opacity-75">เริ่มต้นวันทำงานที่สดใส พร้อมจัดการระบบมาตรน้ำอย่างมีประสิทธิภาพ</div>
                        </div>
                        <div class="text-end d-none d-lg-block">
                            <div id="liveClock" style="font-size: 3.5rem; font-weight: 700; letter-spacing: -2px;">00:00:00</div>
                            <div class="badge bg-white text-primary rounded-pill px-4 py-2 mt-2 fw-bold">Region 10 Online</div>
                        </div>
                    </div>
                    <div class="px-4 mt-4 mb-2"><h5 class="fw-bold text-dark">แจ้งเหตุและบริการด่วน</h5></div>
                    <div class="action-grid">
                        <a href="report_leak.php" class="action-tile" style="background:var(--c1)"><i class="fa-solid fa-droplet"></i><span>แจ้งท่อรั่ว/แตก</span></a>
                        <a href="#" class="action-tile" style="background:var(--c2)"><i class="fa-solid fa-tag"></i><span>แจ้งลวดตีตราขาด</span></a>
                        <a href="#" class="action-tile" style="background:var(--c3)"><i class="fa-solid fa-box-archive"></i><span>แจ้งยกมาตรน้ำ</span></a>
                        <a href="#" class="action-tile" style="background:var(--c4)"><i class="fa-solid fa-users"></i><span>เปลี่ยนประเภทผู้ใช้</span></a>
                        <a href="#" class="action-tile" style="background:var(--c5)"><i class="fa-solid fa-moon"></i><span>MOONLIGHT SCANNER</span></a>
                        <a href="#" class="action-tile" style="background:var(--c6)"><i class="fa-solid fa-ruler-vertical"></i><span>แจ้งน้ำสูง/ต่ำ</span></a>
                        <a href="#" class="action-tile" style="background:var(--c7)"><i class="fa-solid fa-glasses"></i><span>แจ้งลักใช้น้ำ</span></a>
                        <a href="#" class="action-tile" style="background:var(--c8)"><i class="fa-solid fa-circle-xmark"></i><span>แจ้งมาตรชำรุด</span></a>
                    </div>
                </main>
            </div>
        </div>
        <footer class="main-footer"><div>METERCare &copy; 2025 Provincial Waterworks Authority.</div><div>Professional Pro Edition</div></footer>
    </div>
    <script>setInterval(() => { document.getElementById('liveClock').innerText = new Date().toLocaleTimeString('th-TH',{hour12:false}); }, 1000);</script>
</body>
</html>
