#!/usr/bin/env pwsh
Write-Host "Serving ./ on http://localhost:8000"
python -m http.server 8000
