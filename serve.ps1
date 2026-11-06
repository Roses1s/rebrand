#requires -version 5.1
# ---------------------------------------------------------------
#  ТрансЛайн CRM — локальный сервер без установки Node.js/Python.
#  Раздаёт файлы из папки проекта и открывает браузер.
#
#  Запуск:
#     powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1
#  или просто двойной клик по «Запустить на Windows.bat»
# ---------------------------------------------------------------

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
if (-not $root) { $root = Split-Path -Parent $MyInvocation.MyCommand.Path }
$root = $root.TrimEnd([char[]]@('\', '/'))

$mime = @{
  '.html'  = 'text/html; charset=utf-8'
  '.htm'   = 'text/html; charset=utf-8'
  '.css'   = 'text/css; charset=utf-8'
  '.js'    = 'text/javascript; charset=utf-8'
  '.mjs'   = 'text/javascript; charset=utf-8'
  '.json'  = 'application/json; charset=utf-8'
  '.svg'   = 'image/svg+xml'
  '.png'   = 'image/png'
  '.jpg'   = 'image/jpeg'
  '.jpeg'  = 'image/jpeg'
  '.webp'  = 'image/webp'
  '.ico'   = 'image/x-icon'
  '.woff'  = 'font/woff'
  '.woff2' = 'font/woff2'
  '.txt'   = 'text/plain; charset=utf-8'
}

# --- ищем свободный порт ---
$listener = $null
$port = 0
foreach ($tryPort in @(8000, 8080, 3000, 5500)) {
  try {
    $candidate = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $tryPort)
    $candidate.Start()
    $listener = $candidate
    $port = $tryPort
    break
  }
  catch {
    $listener = $null
  }
}

if (-not $listener) {
  Write-Host ''
  Write-Host '  Не удалось занять порт 8000/8080/3000/5500.' -ForegroundColor Yellow
  Write-Host '  Можно просто открыть index.html двойным щелчком.' -ForegroundColor Yellow
  Write-Host ''
  exit 1
}

$url = "http://localhost:$port"
Write-Host ''
Write-Host '  ТрансЛайн CRM — локальный сервер запущен' -ForegroundColor Green
Write-Host "  Откройте в браузере: $url"
Write-Host '  Остановить:          Ctrl + C'
Write-Host ''
try { Start-Process $url } catch { }

function Send-Response {
  param(
    $Stream,
    [int]$Status,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body,
    [bool]$HeadOnly
  )
  $header = "HTTP/1.1 $Status $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if (-not $HeadOnly) { $Stream.Write($Body, 0, $Body.Length) }
  $Stream.Flush()
}

function Send-Plain {
  param($Stream, [int]$Status, [string]$StatusText, [string]$Text, [bool]$HeadOnly)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  Send-Response $Stream $Status $StatusText 'text/plain; charset=utf-8' $bytes $HeadOnly
}

while ($true) {
  $client = $null
  $stream = $null
  try {
    $client = $listener.AcceptTcpClient()
    $client.ReceiveTimeout = 5000
    $stream = $client.GetStream()

    $buffer = New-Object byte[] 8192
    $sb = New-Object System.Text.StringBuilder
    do {
      $read = $stream.Read($buffer, 0, $buffer.Length)
      if ($read -le 0) { break }
      [void]$sb.Append([System.Text.Encoding]::ASCII.GetString($buffer, 0, $read))
    } while ($sb.ToString() -notmatch "`r`n`r`n")

    $requestLine = ($sb.ToString() -split "`r`n")[0]
    if ([string]::IsNullOrWhiteSpace($requestLine)) { throw 'пустой запрос' }

    $parts = $requestLine -split ' '
    $method = $parts[0]
    $rawPath = '/'
    if ($parts.Length -gt 1) { $rawPath = $parts[1] }
    $headOnly = ($method -eq 'HEAD')

    if ($method -ne 'GET' -and $method -ne 'HEAD') {
      Send-Plain $stream 405 'Method Not Allowed' 'Разрешены только GET и HEAD' $false
      continue
    }

    $path = $rawPath
    $qIndex = $path.IndexOf('?')
    if ($qIndex -ge 0) { $path = $path.Substring(0, $qIndex) }
    $path = [System.Uri]::UnescapeDataString($path)
    if ($path -eq '' -or $path -eq '/') { $path = '/index.html' }

    $relative = $path.TrimStart([char[]]@('/', '\'))
    $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relative))

    $rootPrefix = $root + [System.IO.Path]::DirectorySeparatorChar
    if (-not $fullPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      Send-Plain $stream 403 'Forbidden' 'Доступ запрещён' $headOnly
      continue
    }

    if ([System.IO.Directory]::Exists($fullPath)) {
      $fullPath = [System.IO.Path]::Combine($fullPath, 'index.html')
    }

    if (-not [System.IO.File]::Exists($fullPath)) {
      $page = '<!doctype html><meta charset="utf-8"><title>404</title><body style="font:16px system-ui;padding:40px"><h1>404 — файл не найден</h1><p><a href="/">На главную</a></p></body>'
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($page)
      Send-Response $stream 404 'Not Found' 'text/html; charset=utf-8' $bytes $headOnly
      continue
    }

    $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
    $contentType = 'application/octet-stream'
    if ($mime.ContainsKey($ext)) { $contentType = $mime[$ext] }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    Send-Response $stream 200 'OK' $contentType $bytes $headOnly
  }
  catch {
    # битые/оборванные запросы игнорируем — сервер продолжает работать
  }
  finally {
    if ($stream) { try { $stream.Close() } catch { } }
    if ($client) { try { $client.Close() } catch { } }
  }
}
