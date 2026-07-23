<?php
require_once "../includes/db.php";
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
    $status = isset($_POST['status']) ? $_POST['status'] : ''; 

    if ($id > 0 && ($status == 'pending' || $status == 'Completed')) {
        $stmt = $conn->prepare("UPDATE reports SET status = ? WHERE id = ?");
        $stmt->bind_param("si", $status, $id);
        
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "อัปเดตงาน #$id เรียบร้อย"]);
        } else {
            echo json_encode(["status" => "error", "message" => "SQL Error: " . $conn->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["status" => "error", "message" => "ข้อมูลไม่ถูกต้อง"]);
    }
}
?>
