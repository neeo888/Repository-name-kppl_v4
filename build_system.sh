#!/bin/zsh
# METERCare Project Manager - Region 10 Ultimate Edition (Visual Fix & Workflow)
# Vibrant Theme + 26 Branches + Premium Individual Actions UI

PROJ_DIR="/Applications/XAMPP/xamppfiles/htdocs/wmts-project"
cd "$PROJ_DIR"

G='\033[0;32m'
B='\033[0;34m'
Y='\033[1;33m'
NC='\033[0m'

echo -e "${B}🏗️  กำลังแก้ไขกลุ่มไอคอนจัดการงานให้สวยพรีเมียมและปรับ Workflow...${NC}"

# 1. ปรับปรุง CSS (Assets/css/style.css) - บังคับสีปุ่ม Action ให้ทันสมัย
mkdir -p assets/css
cat << 'EOCSS' > assets/css/style.css
@import url("https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap");

:root {
    --bg-body: #f8f9fa;
    --sidebar-bg: #283593; 
    --topbar-bg: #2196f3; 
    --footer-height: 60px;
    
    /* โทนสี Action Tiles */
    --tile-green: #4caf50;
    --tile-blue: #2196f3;
    --tile-yellow: #ffc107;
    --tile-purple-light: #9c27b0;
    --tile-orange: #ff5722;
    --tile-red: #f44336;
}

body { font-family: "Kanit", sans-serif; background-color: var(--bg-body); margin: 0; padding: 0; }
.app-shell { display: flex; flex-direction: column; min-height: 100vh; }
.main-body { display: flex; flex: 1; position: relative; }

/* Sidebar */
.sidebar { width: 280px; background: var(--sidebar-bg); display: flex; flex-direction: column; height: calc(100vh - var(--footer-height)); position: sticky; top: 0; z-index: 100; flex-shrink: 0; }
.sidebar-header { padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 700; color: white; font-size: 1.1rem; }
.nav-link-custom { color: rgba(255,255,255,0.8); padding: 0.85rem 1.5rem; display: flex; align-items: center; text-decoration: none; transition: 0.2s; }
.nav-link-custom:hover, .nav-link-custom.active { background: rgba(0,0,0,0.15); color: white; font-weight: 500; }
.nav-badge { background: #ff4081; color: white; font-size: 0.75rem; padding: 2px 10px; border-radius: 50px; margin-left: auto; font-weight: 700; }

/* Topbar */
.topbar { background: var(--topbar-bg); color: white; padding: 0.6rem 2rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); z-index: 200; }
.main-container { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow-y: auto; }
.content-card { background: white; border-radius: 25px; padding: 2.5rem; margin: 1.5rem 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: none; }

/* --- ยกระดับปุ่มจัดการเฉพาะงาน (Vibrant Premium UI) --- */
/* ปรับสไตล์ปุ่มจากเดิมที่เป็นสี่เหลี่ยมดำขาว ให้เป็นปุ่มพรีเมียม */
.btn-action-group { display: flex; gap: 8px; justify-content: center; }

.btn-action { 
    width: 42px !important; 
    height: 42px !important; 
    border-radius: 14px !important; 
    display: inline-flex !important; 
    align-items: center !important; 
    justify-content: center !important; 
    border: none !important; 
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important; 
    cursor: pointer;
}

.btn-action:hover { 
    transform: scale(1.15) rotate(5deg) !important; 
    z-index: 10; 
}

/* ปุ่มสถานะสำเร็จ - เขียวพาสเทล */
.btn-complete { 
    background-color: #E6FFED !important; 
    color: #00874C !important; 
    box-shadow: 0 4px 10px rgba(0, 135, 76, 0.15) !important; 
}
.btn-complete:hover { background-color: #00874C !important; color: white !important; }

/* ปุ่มแก้ไข - ฟ้าพาสเทล */
.btn-edit { 
    background-color: #E6F7FF !important; 
    color: #007BFF !important; 
    box-shadow: 0 4px 10px rgba(0, 123, 255, 0.15) !important; 
}
.btn-edit:hover { background-color: #007BFF !important; color: white !important; }

/* ปุ่ม PDF - ส้มพาสเทล */
.btn-pdf { 
    background-color: #FFF0E6 !important; 
    color: #FF8C00 !important; 
    box-shadow: 0 4px 10px rgba(255, 140, 0, 0.15) !important; 
}
.btn-pdf:hover { background-color: #FF8C00 !important; color: white !important; }

/* ปุ่มลบ - แดงพาสเทล */
.btn-delete { 
    background-color: #FFE6E6 !important; 
    color: #DC3545 !important; 
    box-shadow: 0 4px 10px rgba(220, 53, 69, 0.15) !important; 
}
.btn-delete:hover { background-color: #DC3545 !important; color: white !important; }

.branch-select { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 50px; padding: 5px 15px; font-size: 0.85rem; outline: none; }
.main-footer { background: #1a1c1e; color: #94a3b8; padding: 1.2rem 2.5rem; height: var(--footer-height); width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; border-top: 1px solid #333; }
EOCSS

# 2. ปรับปรุงหน้าจัดการงาน (Pending Jobs) - ให้ใช้ Class ปุ่มใหม่และระบบ Workflow
cat << 'EOP' > pages/pending_jobs.php
<?php 
session_start();
require_once "../includes/db.php"; 
// ดึงเฉพาะงานที่ยังไม่เสร็จ (ล่าสุดอยู่บนสุด)
$result = $conn->query("SELECT * FROM reports WHERE status IN ('Open', 'pending') ORDER BY id DESC");
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>งานรอดำเนินการ - METERCare</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
    <link href="https://cdn.datatables.net/1.13.7/css/dataTables.bootstrap5.min.css" rel="stylesheet">
    <link href="../assets/css/style.css" rel="stylesheet">
</head>
<body>
    <div class="app-shell">
        <?php include "../includes/topnavbar.php"; ?>
        <div class="main-body">
            <?php include "../includes/sidebar.php"; ?>
            <div class="main-container">
                <main>
                    <div class="content-card">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h4 class="fw-bold text-primary mb-0"><i class="fa-solid fa-list-check me-2"></i> ศูนย์จัดการงานรอดำเนินการ</h4>
                                <p class="text-muted small mb-0">งานที่ยืนยันสำเร็จจะหายจากหน้านี้และไปที่หน้า "งานตรวจสอบแล้ว"</p>
                            </div>
                            <span class="badge bg-primary rounded-pill px-4 py-2">งานคงค้าง: <?= $result->num_rows ?> รายการ</span>
                        </div>
                        
                        <table id="jobTable" class="table table-hover align-middle w-100">
                            <thead class="table-light">
                                <tr><th>ID</th><th>ประเภทเหตุ</th><th>ผู้แจ้ง</th><th>พิกัด</th><th>วันที่แจ้ง</th><th class="text-center">จัดการเฉพาะงาน</th></tr>
                            </thead>
                            <tbody>
                                <?php while($row = $result->fetch_assoc()): ?>
                                <tr>
                                    <td class="fw-bold text-muted">#<?= $row['id'] ?></td>
                                    <td><span class="badge bg-light text-dark fw-bold border p-2"><?= htmlspecialchars($row['type']) ?></span></td>
                                    <td class="fw-bold"><?= htmlspecialchars($row['reporter']) ?></td>
                                    <td><code class="text-danger small"><?= $row['coordinates'] ?></code></td>
                                    <td class="small text-muted"><?= date('d/m/H:i', strtotime($row['created_at'])) ?></td>
                                    <td class="text-center">
                                        <div class="btn-action-group">
                                            <!-- ปุ่มตรวจสอบสำเร็จ (วงกลมเขียวพรีเมียม) -->
                                            <button class="btn-action btn-complete" title="ยืนยันตรวจสอบสำเร็จ" onclick="updateJob(<?= $row['id'] ?>, 'Completed')">
                                                <i class="fa-solid fa-check-circle"></i>
                                            </button>
                                            <!-- ปุ่มแก้ไข (ฟ้าพรีเมียม) -->
                                            <button class="btn-action btn-edit" title="แก้ไขข้อมูล" onclick="openEditModal(<?= htmlspecialchars(json_encode($row)) ?>)">
                                                <i class="fa-solid fa-pen-to-square"></i>
                                            </button>
                                            <!-- ปุ่ม PDF (ส้มพรีเมียม) -->
                                            <button class="btn-action btn-pdf" title="ส่งออก PDF" onclick="alert('📄 กำลังสร้างรายงาน PDF สำหรับงาน #<?= $row['id'] ?>')">
                                                <i class="fa-solid fa-file-pdf"></i>
                                            </button>
                                            <!-- ปุ่มลบ (แดงพรีเมียม) -->
                                            <button class="btn-action btn-delete" title="ลบรายการ" onclick="updateJob(<?= $row['id'] ?>, 'Deleted')">
                                                <i class="fa-solid fa-trash-alt"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <?php endwhile; ?>
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
        <footer class="main-footer"><div>METERCare &copy; 2025 Provincial Waterworks Authority.</div><div>V.5.0.4 Premium Vibrant</div></footer>
    </div>

    <!-- Edit Modal (คงเดิม) -->
    <div class="modal fade" id="editModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <form id="editForm" class="modal-content shadow-lg border-0" style="border-radius:25px;">
                <div class="modal-header border-0 bg-primary text-white p-4">
                    <h5 class="fw-bold mb-0">แก้ไขข้อมูลใบงาน #<span id="display_id"></span></h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    <input type="hidden" name="id" id="edit_id">
                    <div class="mb-3"><label class="form-label fw-bold small">ประเภทเหตุ</label><input type="text" name="type" id="edit_type" class="form-control rounded-3" required></div>
                    <div class="mb-3"><label class="form-label fw-bold small">ชื่อผู้แจ้ง</label><input type="text" name="reporter" id="edit_reporter" class="form-control rounded-3" required></div>
                    <div class="mb-0"><label class="form-label fw-bold small">พิกัด</label><input type="text" name="coordinates" id="edit_coords" class="form-control rounded-3"></div>
                </div>
                <div class="modal-footer border-0 p-4 pt-0">
                    <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="submit" class="btn btn-primary rounded-pill px-4 shadow">บันทึกการแก้ไข</button>
                </div>
            </form>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/dataTables.bootstrap5.min.js"></script>
    <script>
    $(document).ready(function() { $('#jobTable').DataTable({ order: [[0, 'desc']], language: { url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/th.json' } }); });

    function updateJob(id, status) {
        let msg = status === 'Completed' ? 'ยืนยันตรวจสอบสำเร็จ?\nงานนี้จะหายไปจากหน้านี้และไปอยู่ที่หน้า "งานตรวจสอบแล้ว"' : 'ยืนยันการลบงานนี้ถาวร?';
        if(confirm(msg)) {
            const formData = new FormData(); 
            formData.append('id', id); 
            formData.append('status', status);
            fetch('update_status.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => { 
                if(data.status === 'success') {
                    if(status === 'Completed') {
                        window.location.href = 'completed_jobs.php';
                    } else {
                        location.reload();
                    }
                } 
            });
        }
    }

    function openEditModal(data) {
        document.getElementById('edit_id').value = data.id; document.getElementById('display_id').innerText = data.id;
        document.getElementById('edit_type').value = data.type; document.getElementById('edit_reporter').value = data.reporter;
        document.getElementById('edit_coords').value = data.coordinates; new bootstrap.Modal(document.getElementById('editModal')).show();
    }

    document.getElementById('editForm').onsubmit = async (e) => {
        e.preventDefault(); const formData = new FormData(e.target);
        const res = await fetch('edit_job.php', { method: 'POST', body: formData });
        const data = await res.json(); if(data.status === 'success') location.reload();
    };
    </script>
</body>
</html>
EOP

# 3. สร้างหน้า "งานตรวจสอบแล้ว" (Completed Jobs)
cat << 'EOC' > pages/completed_jobs.php
<?php 
session_start();
require_once "../includes/db.php"; 
$result = $conn->query("SELECT * FROM reports WHERE status = 'Completed' ORDER BY id DESC");
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>งานตรวจสอบแล้ว - METERCare</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
    <link href="https://cdn.datatables.net/1.13.7/css/dataTables.bootstrap5.min.css" rel="stylesheet">
    <link href="../assets/css/style.css" rel="stylesheet">
    <style>.content-card { background: white; border-radius: 25px; padding: 2.5rem; margin: 1.5rem 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }</style>
</head>
<body>
    <div class="app-shell">
        <?php include "../includes/topnavbar.php"; ?>
        <div class="main-body">
            <?php include "../includes/sidebar.php"; ?>
            <div class="main-container">
                <main>
                    <div class="content-card">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h4 class="fw-bold text-success mb-0"><i class="fa-solid fa-clipboard-check me-2"></i> รายการงานที่ตรวจสอบสมบูรณ์</h4>
                            <span class="badge bg-success rounded-pill px-4 py-2">สำเร็จแล้ว: <?= $result->num_rows ?> รายการ</span>
                        </div>
                        <table id="completeTable" class="table table-hover align-middle w-100">
                            <thead class="table-light">
                                <tr><th>ID</th><th>ประเภทเหตุ</th><th>ผู้รับผิดชอบ</th><th>วันที่สำเร็จ</th><th>พิกัด</th><th>สถานะ</th></tr>
                            </thead>
                            <tbody>
                                <?php while($row = $result->fetch_assoc()): ?>
                                <tr>
                                    <td class="fw-bold text-muted">#<?= $row['id'] ?></td>
                                    <td><span class="fw-bold text-dark"><?= htmlspecialchars($row['type']) ?></span></td>
                                    <td class="fw-bold"><?= htmlspecialchars($row['reporter']) ?></td>
                                    <td class="small text-muted"><?= $row['created_at'] ?></td>
                                    <td><code class="text-dark small"><?= $row['coordinates'] ?></code></td>
                                    <td><span class="badge bg-success-subtle text-success rounded-pill px-3 py-1">ตรวจสอบแล้ว</span></td>
                                </tr>
                                <?php endwhile; ?>
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    </div>
    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/dataTables.bootstrap5.min.js"></script>
    <script>$(document).ready(function(){ $('#completeTable').DataTable({ order: [[0, 'desc']], language: { url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/th.json' } }); });</script>
</body>
</html>
EOC

# 4. อัปเดต Topnavbar (26 สาขา)
cat << 'EOTN' > includes/topnavbar.php
<?php
$branches = ["นครสวรรค์", "พยุหะคีรี", "ลาดยาว", "เก้าเลี้ยว", "ชุมแสง", "ตาคลี", "หนองบัว", "พิจิตร", "ตะพานหิน", "บางมูลนาก", "กำแพงเพชร", "พรานกระต่าย", "คลองขลุง", "ขาณุวรลักษบุรี", "อุทัยธานี", "หนองฉาง", "สว่างอารมณ์", "บ้านไร่", "ตาก", "แม่สอด", "สามเงา", "บ้านตาก", "สุโขทัย", "สวรรคโลก", "ศรีสัชนาลัย", "กงไกรลาศ"];
?>
<header class="topbar">
    <div class="fw-bold d-flex align-items-center">
        <span class="me-3">[MSTD] METERCare (กปภ.เขต 10)</span>
        <select class="branch-select d-none d-md-block">
            <?php foreach($branches as $b): ?>
                <option value="<?= $b ?>" <?= ($b == "แม่สอด") ? "selected" : "" ?>>สาขา<?= $b ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <div style="display: flex; align-items: center; gap: 15px;">
        <span class="small d-none d-sm-inline"><strong><?= htmlspecialchars($_SESSION['name'] ?? 'คุณธนภัทร') ?></strong></span>
        <a href="../logout.php" class="text-white"><i class="fa-solid fa-circle-user fs-4"></i></a>
    </div>
</header>
EOTN

chmod -R 755 .
echo -e "${G}--- ✅ บังคับปรับปรุงกลุ่มไอคอนจัดการงานพรีเมียมและ Workflow สำเร็จแล้วครับ ---${NC}"
