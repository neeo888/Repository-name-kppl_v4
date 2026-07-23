#!/bin/zsh
G='\033[0;32m'
R='\033[0;31m'
B='\033[0;34m'
Y='\033[1;33m'
NC='\033[0m'
echo -e "${B}🔍 เริ่มการตรวจสอบระบบ METERCare...${NC}"
PROJ_DIR="/Applications/XAMPP/xamppfiles/htdocs/wmts-project"
if [ -d "$PROJ_DIR" ]; then
    cd "$PROJ_DIR"
    echo -e "${G}[✓] ตำแหน่งโปรเจกต์: ถูกต้อง${NC}"
else
    echo -e "${R}[X] ไม่พบโฟลเดอร์โปรเจกต์${NC}"
    exit 1
fi
echo -e "\n${Y}[1/3] ตรวจสอบการเชื่อมต่อ Database จาก PHP:${NC}"
php -r "include 'includes/db.php'; if(isset(\$conn) && !\$conn->connect_error) { echo 'Connection OK'; exit(0); } else { exit(1); }" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${G}[✓] PHP เชื่อมต่อ MySQL สำเร็จ${NC}"
else
    echo -e "${R}[X] PHP เชื่อมต่อไม่ได้ (เช็ค MySQL ใน XAMPP)${NC}"
fi
