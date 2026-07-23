<?php 
session_start(); require_once "../includes/db.php"; 
$result = $conn->query("SELECT * FROM reports WHERE status IN ('Open', 'pending') ORDER BY id DESC");
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8"><title>งานรอดำเนินการ - METERCare</title>
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
                <main class="p-4">
                    <div style="background:white; border-radius:24px; padding:2.5rem; box-shadow:0 15px 35px rgba(0,0,0,0.05);">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h4 class="fw-bold mb-0">รายการงานรอดำเนินการ</h4>
                            <span class="badge bg-primary rounded-pill px-4 py-2">ค้างอยู่: <?= $result->num_rows ?> งาน</span>
                        </div>
                        <div class="table-responsive">
                            <table class="table align-middle">
                                <thead class="table-light"><tr><th>ID</th><th>ประเภท</th><th>ผู้แจ้ง</th><th class="text-center">จัดการเฉพาะงาน</th></tr></thead>
                                <tbody>
                                    <?php while($row = $result->fetch_assoc()): ?>
                                    <tr>
                                        <td class="fw-bold text-muted">#<?= $row['id'] ?></td>
                                        <td><span class="badge bg-info-subtle text-primary p-2" style="border-radius:10px;"><?= htmlspecialchars($row['type']) ?></span></td>
                                        <td class="fw-bold"><?= htmlspecialchars($row['reporter']) ?></td>
                                        <td class="text-center">
                                            <div class="d-flex justify-content-center">
                                                <!-- ปุ่มยืนยันสำเร็จ: จะเรียกใช้ฟังก์ชัน JS เพื่อส่งข้อมูลไป Backend -->
                                                <button class="btn-action-vibrant btn-v-success" title="ยืนยันสำเร็จ" onclick="completeJob(<?= $row['id'] ?>)">
                                                    <i class="fa-solid fa-check"></i>
                                                </button>
                                                <button class="btn-action-vibrant btn-v-info" title="แก้ไขข้อมูล"><i class="fa-solid fa-pen"></i></button>
                                                <button class="btn-action-vibrant btn-v-danger" title="ลบรายการ"><i class="fa-solid fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                    <?php endwhile; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    </div>
    <script>
    function completeJob(id) {
        if(confirm('ยืนยันว่างานหมายเลข #' + id + ' ตรวจสอบเสร็จสมบูรณ์?')) {
            const formData = new FormData();
            formData.append('id', id);
            formData.append('status', 'Completed');
            fetch('update_status.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    alert('✅ งานถูกย้ายไปที่หน้าตรวจสอบแล้ว!');
                    location.reload();
                } else {
                    alert('❌ ผิดพลาด: ' + data.message);
                }
            });
        }
    }
    </script>
</body>
</html>
