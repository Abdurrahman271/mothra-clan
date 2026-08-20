@echo off
title MOTHRA CLAN — Web Server
color 0E
echo ======================================================
echo   MOTHRA CLAN POINT BLANK - WEB SERVER
echo ======================================================
echo.
echo Menjalankan local web server...
echo URL Bersih: http://localhost:3000
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start http://localhost:3000
    node server.js
) else (
    echo [INFO] Node.js tidak ditemukan, menjalankan server alternatif PowerShell...
    start http://localhost:3000
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:3000/'); $listener.Start(); Write-Host 'Server running at http://localhost:3000/'; while ($listener.IsListening) { $context = $listener.GetContext(); $req = $context.Request; $res = $context.Response; $urlPath = $req.Url.LocalPath; if ($urlPath -eq '/') { $urlPath = '/index.html' }; $localFile = Join-Path (Get-Location) $urlPath.TrimStart('/'); if (Test-Path $localFile -PathType Leaf) { $bytes = [System.IO.File]::ReadAllBytes($localFile); $ext = [System.IO.Path]::GetExtension($localFile).ToLower(); switch ($ext) { '.html' { $res.ContentType = 'text/html; charset=utf-8' } '.css' { $res.ContentType = 'text/css; charset=utf-8' } '.js' { $res.ContentType = 'application/javascript; charset=utf-8' } '.png' { $res.ContentType = 'image/png' } '.jpg' { $res.ContentType = 'image/jpeg' } '.svg' { $res.ContentType = 'image/svg+xml' } default { $res.ContentType = 'application/octet-stream' } }; $res.AddHeader('X-Content-Type-Options', 'nosniff'); $res.AddHeader('X-Frame-Options', 'SAMEORIGIN'); $res.OutputStream.Write($bytes, 0, $bytes.Length); $res.Close() } else { $res.StatusCode = 404; $res.Close() } }"
)
pause
