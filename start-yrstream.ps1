# YR Stream - Local High Performance Streaming Platform Startup Script
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   YR STREAM - STARTING LOCAL MEDIA SERVER & WEB APP     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check MongoDB Service
$mongoService = Get-Service -Name "*mongo*" -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -ne "Running") {
    Write-Host "Starting MongoDB service..." -ForegroundColor Yellow
    Start-Service -Name $mongoService.Name
}

# 2. Get Local IPv4 Address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notmatch "Loopback|vEthernet|Virtual" -and 
    ($_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.16.*") 
} | Select-Object -First 1).IPAddress

if (-not $localIP) { $localIP = "127.0.0.1" }

Write-Host "Local LAN IP Address Detected: $localIP" -ForegroundColor Green
Write-Host "LG Smart TV Access URL: http://${localIP}:3000" -ForegroundColor Green
Write-Host "PC Web Access URL:      http://localhost:3000" -ForegroundColor Green
Write-Host "Backend API URL:        http://${localIP}:5000" -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Gray

# 3. Start Backend in a new window
Write-Host "Launching YR Stream Backend (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# 4. Start Frontend in a new window
Write-Host "Launching YR Stream Frontend (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nAll services are starting up! Open http://localhost:3000 in your browser." -ForegroundColor Cyan
