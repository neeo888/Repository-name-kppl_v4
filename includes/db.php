<?php
mysqli_report(MYSQLI_REPORT_OFF);
$conn = @new mysqli('127.0.0.1', 'root', '', 'metercare_dev5', 3307);
if ($conn->connect_error) {
    $conn = @new mysqli('127.0.0.1', 'root', '', 'metercare_dev5', 3306);
}
if ($conn->connect_error) {
    die("Database Connection Error");
}
$conn->set_charset("utf8mb4");
?>
