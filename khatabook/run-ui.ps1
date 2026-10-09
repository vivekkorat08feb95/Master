# Script to run Khatabook React Frontend
Write-Host "Starting Khatabook React Frontend on http://localhost:3000..." -ForegroundColor Green
Set-Location -Path "$PSScriptRoot\src\khatabook-ui"
npm run dev
