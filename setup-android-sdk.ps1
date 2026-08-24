# Create SDK Directory
$sdkDir = "C:\Android\sdk"
if (!(Test-Path $sdkDir)) {
    New-Item -ItemType Directory -Path $sdkDir -Force
}

# Create cmdline-tools directory
$cmdlineDir = "$sdkDir\cmdline-tools"
if (!(Test-Path $cmdlineDir)) {
    New-Item -ItemType Directory -Path $cmdlineDir -Force
}

# Download Android Command Line Tools ZIP
$zipUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$zipFile = "$cmdlineDir\cmdline-tools.zip"

Write-Host "Downloading Android Command Line Tools (approx. 120MB)..."
Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile

Write-Host "Extracting Command Line Tools..."
Expand-Archive -Path $zipFile -DestinationPath "$cmdlineDir\temp" -Force

# Rearrange into the required 'latest' directory structure
$latestDir = "$cmdlineDir\latest"
if (Test-Path $latestDir) {
    Remove-Item $latestDir -Recurse -Force
}
Rename-Item -Path "$cmdlineDir\temp\cmdline-tools" -NewName "latest"
Move-Item -Path "$cmdlineDir\temp\latest" -Destination $cmdlineDir -Force

# Clean up temp files
if (Test-Path "$cmdlineDir\temp") {
    Remove-Item -Path "$cmdlineDir\temp" -Recurse -Force
}
if (Test-Path $zipFile) {
    Remove-Item -Path $zipFile -Force
}

# Set Environment Variables for the active session and user account
$env:ANDROID_HOME = $sdkDir
$env:ANDROID_SDK_ROOT = $sdkDir
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkDir, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkDir, "User")

Write-Host "Accepting licenses..."
$sdkmanager = "$latestDir\bin\sdkmanager.bat"
$yes = , 'y' * 100
$yes | & $sdkmanager --licenses --sdk_root=$sdkDir

Write-Host "Installing Android SDK Platform-Tools, Platforms (API 34), and Build-Tools (34.0.0)..."
& $sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" --sdk_root=$sdkDir

# Update local.properties in the project
$localPropertiesPath = "$PSScriptRoot\apps\customer\android\local.properties"
"sdk.dir=C:/Android/sdk" | Out-File -FilePath $localPropertiesPath -Encoding utf8 -Force

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " Android SDK setup completed successfully!" -ForegroundColor Green
Write-Host " ANDROID_HOME environment variable set to: $sdkDir" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
