<?php 
session_start(); require_once "../includes/db.php"; 
$result = $conn->query("SELECT * FROM reports WHERE status = 'Completed' ORDER BY id DESC");
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8"><title>งานที่ตรวจสอบแล้ว - METERCare</title>
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
                            <h4 class="fw-bold text-success mb-0"><i class="fa-solid fa-circle-check me-2"></i> งานตรวจสอบเสร็จสิ้นแล้ว</h4>
                            <span class="badge bg-success rounded-pill px-4 py-2">รวม: <?= $result->num_rows ?> รายการ</span>
                        </div>
                        <div class="table-responsive">
                            <table class="table align-middle">
                                <thead class="table-light"><tr><th>ID</th><th>ประเภท</th><th>ผู้รับผิดชอบ</th><th class="text-center">จัดการ/ส่งคืน</th></tr></thead>
                                <tbody>
                                    <?php while($row = $result->fetch_assoc()): ?>
                                    <tr>
                                        <td class="fw-bold text-muted">#<?= $row['id'] ?></td>
                                        <td><span class="badge bg-success-subtle text-success p-2" style="border-radius:10px;"><?= htmlspecialchars($row['type']) ?></span></td>
                                        <td class="fw-bold"><?= htmlspecialchars($row['reporter']) ?></td>
                                        <td class="text-center">
                                            <div class="d-flex justify-content-center">
                                                <button class="btn-action-vibrant btn-v-info" title="ดูรายละเอียด"><i class="fa-solid fa-eye"></i></button>
                                                <!-- ปุ่มส่งคืน: จะเรียกใช้ฟังก์ชัน JS เพื่อย้ายสถานะกลับเป็น pending -->
                                                <button class="btn-action-vibrant btn-v-return" title="ส่งกลับไปแก้ไข" onclick="returnToPending(<?= $row['id'] ?>)">
                                                    <i class="fa-solid fa-rotate-left"></i>
                                                </button>
                                                <button class="btn-action-vibrant btn-v-danger" title="ลบประวัติ"><i class="fa-solid fa-trash"></i></button>
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
    function returnToPending(id) {
        if(confirm('ยืนยันดึงงานหมายเลข #' + id + ' กลับไปที่หน้า "รอตรวจสอบ" เพื่อแก้ไขใหม่?')) {
            const formData = new FormData();
            formData.append('id', id);
            formData.append('status', 'pending');
            fetch('update_status.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    alert('✨ ดึงงานกลับไปที่หน้ารอตรวจสอบเรียบร้อยแล้ว!');
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
