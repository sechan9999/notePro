# notePro - Quick Launcher
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "📝 Starting notePro (Backend & Frontend)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Start Backend
Start-Process -NoNewWindow python -ArgumentList "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"
Write-Host "✅ FastAPI Backend running on http://localhost:8000" -ForegroundColor Green

# Start Frontend
Set-Location frontend
Start-Process -NoNewWindow npm -ArgumentList "run", "dev"
Write-Host "✅ Vite React Frontend running on http://localhost:5173" -ForegroundColor Green
Write-Host "`nOpen http://localhost:5173 in your browser to use Granola Core!" -ForegroundColor Yellow
