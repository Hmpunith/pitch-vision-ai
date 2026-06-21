# Pitch-Vision AI Automated Pitch Video Generator
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Pitch-Vision AI: Automated Video Generator Initializing" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Ensure we are in the script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 1. Check/Install Python dependencies
Write-Host "`n[Step 1/5] Setting up Python dependencies..." -ForegroundColor Green
pip install edge-tts mutagen

# 2. Check/Install Node.js dependencies
Write-Host "`n[Step 2/5] Setting up Node.js dependencies..." -ForegroundColor Green
if (-not (Test-Path "package.json")) {
    npm init -y
}
npm install playwright ffmpeg-static

Write-Host "Installing Playwright Chromium browser..." -ForegroundColor Green
npx playwright install chromium

# 3. Generate Audio Voiceovers
Write-Host "`n[Step 3/5] Generating neural AI voiceover files..." -ForegroundColor Green
python voiceover_generator.py
if ($LASTEXITCODE -ne 0) {
    Write-Error "Voiceover generation failed!"
    exit 1
}

# 4. Run Browser Automation Recording
Write-Host "`n[Step 4/5] Launching Playwright browser for automated screen recording..." -ForegroundColor Green
node record_dashboard.js
if ($LASTEXITCODE -ne 0) {
    Write-Error "Screen recording failed!"
    exit 1
}

# 5. Compile & Merge Video + Audio
Write-Host "`n[Step 5/5] Compiling final H.264 MP4 pitch video with synced audio..." -ForegroundColor Green
node merge_assets.js
if ($LASTEXITCODE -ne 0) {
    Write-Error "Video/Audio compilation failed!"
    exit 1
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   SUCCESS: pitch_vision_demo.mp4 is ready in your project root!" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
