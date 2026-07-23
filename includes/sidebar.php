<?php $current_page = basename($_SERVER['PHP_SELF']); ?>
<aside class="sidebar shadow">
    <div class="sidebar-header"><a href="index.php" class="sidebar-logo"><i class="fa-solid fa-droplet"></i><span>METERCare</span></a></div>
    <div class="sidebar-content">
        <a href="index.php" class="nav-link-custom <?= $current_page == 'index.php' ? 'active' : '' ?>"><i class="fa-solid fa-gauge-high"></i> แดชบอร์ดหลัก</a>
        <div class="menu-label">ศูนย์ปฏิบัติงาน</div>
        <a href="pending_jobs.php" class="nav-link-custom <?= $current_page == 'pending_jobs.php' ? 'active' : '' ?>"><i class="fa-solid fa-clock-rotate-left"></i> งานรอดำเนินการ</a>
        <a href="completed_jobs.php" class="nav-link-custom <?= $current_page == 'completed_jobs.php' ? 'active' : '' ?>"><i class="fa-solid fa-clipboard-check"></i> งานที่ตรวจสอบแล้ว</a>
    </div>
    <div style="padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;"><small class="opacity-50">V.6.3.0 Functional</small></div>
</aside>
