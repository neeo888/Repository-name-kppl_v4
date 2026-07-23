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
