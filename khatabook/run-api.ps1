# Script to run Khatabook .NET Web API backend
Write-Host "Starting Khatabook .NET Web API on http://localhost:5000..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\src\Khatabook.Api"
dotnet run --urls="http://localhost:5000"
