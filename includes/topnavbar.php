<header class="topbar">
    <div class="fw-bold"><i class="fa-solid fa-circle-check text-success me-2"></i>ระบบออนไลน์: กปภ.เขต 10</div>
    <div class="d-flex align-items-center">
        <div class="me-3 text-end d-none d-sm-block">
            <div class="fw-bold small"><?= htmlspecialchars($_SESSION['name'] ?? 'คุณธนภัทร') ?></div>
            <div class="text-muted" style="font-size:0.7rem;"><?= htmlspecialchars($_SESSION['role'] ?? 'Administrator') ?></div>
        </div>
        <a href="../logout.php" class="btn btn-outline-danger btn-sm rounded-pill px-3">ออกจากระบบ</a>
    </div>
</header>
