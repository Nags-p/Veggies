# Veggies Monorepo - APK Builder Script

$ErrorActionPreference = "Stop"

# 1. Build Customer App APK
Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " [1/2] Building Customer App APK..." -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

Write-Host "Building web assets..." -ForegroundColor Yellow
npm run build:customer

Write-Host "Syncing Capacitor with Android project..." -ForegroundColor Yellow
cd apps/customer
npx cap sync android

Write-Host "Compiling Android debug APK..." -ForegroundColor Yellow
cd android
.\gradlew assembleDebug
cd ../../..

# 2. Build Admin App APK
Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " [2/2] Building Admin App APK..." -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

Write-Host "Building web assets..." -ForegroundColor Yellow
npm run build:admin

Write-Host "Syncing Capacitor with Android project..." -ForegroundColor Yellow
cd apps/admin
npx cap sync android

Write-Host "Compiling Android debug APK..." -ForegroundColor Yellow
cd android
.\gradlew assembleDebug
cd ../../..

# Output results
$customerApk1 = "d:\Veggies\apps\customer\android\app\build\outputs\apk\debug\customner.apk"
$customerApk2 = "d:\Veggies\apps\customer\android\app\build\outputs\apk\debug\app-debug.apk"
$adminApk = "d:\Veggies\apps\admin\android\app\build\outputs\apk\debug\app-debug.apk"

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " APK Builds Completed Successfully!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
if (Test-Path $customerApk1) {
    Write-Host "🛒 Customer App APK: $customerApk1" -ForegroundColor Green
} elseif (Test-Path $customerApk2) {
    Write-Host "🛒 Customer App APK: $customerApk2" -ForegroundColor Green
}
if (Test-Path $adminApk) {
    Write-Host "⚡ Admin App APK: $adminApk" -ForegroundColor Green
}
Write-Host "=======================================================" -ForegroundColor Green
