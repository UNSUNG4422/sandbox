param([ValidateRange(0, 30)][int]$LockWaitSeconds = 0)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
$packageRoot = Split-Path -Parent $PSScriptRoot
$runtimeFolder = Join-Path $packageRoot '.runtime'
if (-not (Test-Path -LiteralPath $runtimeFolder)) { Write-Host '現在、このフォルダからは起動していません。'; exit 0 }
$launchLock = $null
try {
    $waitUntil = [DateTime]::UtcNow.AddSeconds($LockWaitSeconds)
    do {
        try { $launchLock = [System.IO.File]::Open((Join-Path $runtimeFolder 'launcher.lock'), 'OpenOrCreate', 'ReadWrite', 'None') }
        catch { if ([DateTime]::UtcNow -ge $waitUntil) { throw '起動または停止の処理中です。少し待ってから実行してください。' }; Start-Sleep -Milliseconds 100 }
    } while (-not $launchLock)
    foreach ($entry in @(@('tunnel.json','cloudflared\cloudflared.exe'), @('server.json','python\python.exe'))) {
        $stateFile = Join-Path $runtimeFolder $entry[0]
        $saved = Read-LauncherState $stateFile
        $process = Get-OwnedProcess $saved (Join-Path $PSScriptRoot $entry[1])
        if ($process) { Stop-RecordedProcess $process $saved }
        Remove-Item -LiteralPath $stateFile -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath (Join-Path $runtimeFolder 'public-url.txt') -ErrorAction SilentlyContinue
    Write-Host '公開とクイズアプリを停止しました。保存データは残っています。' -ForegroundColor Green
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
finally { if ($launchLock) { $launchLock.Dispose() } }
