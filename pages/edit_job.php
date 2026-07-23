<?php
require_once "../includes/db.php";
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $id = $_POST['id'];
    $type = $_POST['type'];
    $reporter = $_POST['reporter'];
    $coords = $_POST['coordinates'];
    
    $stmt = $conn->prepare("UPDATE reports SET type = ?, reporter = ?, coordinates = ? WHERE id = ?");
    $stmt->bind_param("sssi", $type, $reporter, $coords, $id);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => $conn->error]);
    }
    $stmt->close();
}
?>
