# Static server for the offline build, using only what ships with Windows (no Node.js needed).
# Always uses port 4173 so the browser keeps the same origin (and the same saved records).
# Only listens on this computer.
$ErrorActionPreference = 'Stop'
$port = 4173
$url = "http://localhost:$port/"
$root = Join-Path $PSScriptRoot 'app'

$types = @{
  '.html' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'
  '.webmanifest' = 'application/manifest+json'
  '.png' = 'image/png'
  '.ico' = 'image/x-icon'
  '.svg' = 'image/svg+xml'
  '.woff2' = 'font/woff2'
  '.txt' = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
try {
  $listener.Start()
} catch {
  Write-Host 'Already running. Opening the app.'
  Start-Process $url
  Start-Sleep -Seconds 1
  exit 0
}

Write-Host "Class Sign-In is running at $url"
Write-Host 'Leave this window open (minimize it). Close it to stop the app.'
Start-Process $url

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    $parts = $rel -split '[\\/]+' | Where-Object { $_ -and $_ -ne '..' }
    $file = $null
    if ($parts) {
      $candidate = Join-Path $root ($parts -join '\')
      if ([IO.Path]::GetExtension($candidate) -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $file = $candidate
      }
    }
    if (-not $file) { $file = Join-Path $root 'index.html' }

    $ext = [IO.Path]::GetExtension($file).ToLower()
    $type = $types[$ext]
    if (-not $type) { $type = 'application/octet-stream' }
    $bytes = [IO.File]::ReadAllBytes($file)
    $ctx.Response.StatusCode = 200
    $ctx.Response.ContentType = $type
    if ([IO.Path]::GetFileName($file) -eq 'sw.js') {
      $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
    } else {
      $ctx.Response.Headers.Add('Cache-Control', 'public, max-age=3600')
    }
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    $ctx.Response.StatusCode = 500
  } finally {
    $ctx.Response.Close()
  }
}
