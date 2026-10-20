param([switch]$CheckOnly, [switch]$NoBrowser, [switch]$NoClipboard, [string]$ResultFile)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
$packageRoot = Split-Path -Parent $PSScriptRoot
$runtimeFolder = Join-Path $packageRoot '.runtime'
$pythonPath = Join-Path $PSScriptRoot 'python\python.exe'
$cloudflaredPath = Join-Path $PSScriptRoot 'cloudflared\cloudflared.exe'
$serverFile = Join-Path $runtimeFolder 'server.json'
$tunnelFile = Join-Path $runtimeFolder 'tunnel.json'
$urlFile = Join-Path $runtimeFolder 'public-url.txt'
$launchLock = $null
$newServer = $null
$newTunnel = $null

function Show-ShareUrl([string]$Url, [string]$HostUrl) {
    if ($ResultFile) { @{ok=$true;origin=$HostUrl;url=$Url} | ConvertTo-Json | Set-Content -LiteralPath $ResultFile -Encoding UTF8 }
    if (-not $NoClipboard) { try { Set-Clipboard -Value $Url; Write-Host '公開URLをコピーしました。' } catch {} }
    Write-Host ''
    Write-Host '友達に渡すURL:'
    Write-Host $Url -ForegroundColor Green
    Write-Host ''
    Write-Host 'ルームを作成して「招待リンク」を押すと、ルーム付きURLをコピーできます。'
    Write-Host ('主催者の画面: ' + $HostUrl)
    Write-Host '遊んでいる間はPCを起動したままにしてください。'
    Write-Host '終了するときはサーバーウィンドウを閉じてください。'
    if (-not $NoBrowser) { Start-Process $HostUrl }
}

try {
    foreach ($file in @($pythonPath, $cloudflaredPath)) {
        if (-not (Test-Path -LiteralPath $file)) { throw '必要なファイルがありません。ZIP全体を展開し直してください。' }
    }
    if ($CheckOnly) {
        & $pythonPath -B -c 'import fastapi,uvicorn,websockets,multipart,sqlite3'
        if ($LASTEXITCODE -ne 0) { throw '同梱の実行環境を読み込めませんでした。' }
        Write-Host '同梱の実行環境: OK'
        $saved = Read-LauncherState $serverFile
        $server = Get-OwnedProcess $saved $pythonPath
        if ($server) { Write-Host ('アプリの状態: ' + (Get-QuizServerStatus $saved.origin $saved.instance_id)) }
        Write-Host '確認のみです。サーバー起動・外部公開は行っていません。'
        exit 0
    }
    New-Item -ItemType Directory -Path $runtimeFolder -Force | Out-Null
    try { $launchLock = [System.IO.File]::Open((Join-Path $runtimeFolder 'launcher.lock'), 'OpenOrCreate', 'ReadWrite', 'None') }
    catch { throw '起動または停止の処理中です。少し待ってから実行してください。' }
    $savedServer = Read-LauncherState $serverFile
    $server = Get-OwnedProcess $savedServer $pythonPath
    if ($server) {
        $hostUrl = $savedServer.origin
        if ((Get-QuizServerStatus $hostUrl $savedServer.instance_id) -ne 'ready') { throw 'アプリが応答していません。サーバーウィンドウを閉じ、SENSE-Online.exeをもう一度起動してください。' }
    } else {
        Write-Host 'クイズアプリを起動しています...'
        $preferredPort = 8000
        $portFile = Join-Path $runtimeFolder 'port.txt'
        if (Test-Path -LiteralPath $portFile) { [int]::TryParse((Get-Content -LiteralPath $portFile -Raw).Trim(), [ref]$preferredPort) | Out-Null }
        $port = Get-AvailablePort $preferredPort
        "$port" | Set-Content -LiteralPath $portFile -Encoding UTF8
        $hostUrl = 'http://127.0.0.1:' + $port
        $instanceId = [guid]::NewGuid().ToString('N')
        $env:QUIZ_DATA_DIR = Join-Path $packageRoot 'data'
        $env:QUIZ_RUNTIME_DIR = $runtimeFolder
        $env:QUIZ_INSTALLATION_ID = $instanceId
        $newServer = Start-Process -FilePath $pythonPath -ArgumentList @('-B','-m','uvicorn','app.main:app','--host','127.0.0.1','--port',"$port",'--log-level','warning') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardError (Join-Path $runtimeFolder 'server-error.log') -RedirectStandardOutput (Join-Path $runtimeFolder 'server-output.log') -PassThru
        $savedServer = @{pid=$newServer.Id;path=$pythonPath;start_time=$newServer.StartTime.ToUniversalTime().ToString('o');origin=$hostUrl;instance_id=$instanceId}
        $savedServer | ConvertTo-Json | Set-Content -LiteralPath $serverFile -Encoding UTF8
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            $newServer.Refresh()
            if ($newServer.HasExited) { break }
            if ((Get-QuizServerStatus $hostUrl $instanceId) -eq 'ready') { $ready = $true; break }
            Start-Sleep -Milliseconds 500
        }
        if (-not $ready) { throw 'アプリを起動できませんでした。.runtime\server-error.logを確認してください。' }
    }
    $savedTunnel = Read-LauncherState $tunnelFile
    $tunnel = Get-OwnedProcess $savedTunnel $cloudflaredPath
    if ($tunnel) {
        if ($savedTunnel.origin -eq $hostUrl -and $savedTunnel.url) {
            Show-ShareUrl $savedTunnel.url $hostUrl
            exit 0
        }
        Stop-RecordedProcess $tunnel $savedTunnel
    }
    Remove-Item -LiteralPath $tunnelFile -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $urlFile -ErrorAction SilentlyContinue
    Write-Host '公開URLを準備しています...'
    $errorLog = Join-Path $runtimeFolder 'tunnel-error.log'
    $newTunnel = Start-Process -FilePath $cloudflaredPath -ArgumentList @('tunnel','--no-autoupdate','--protocol','http2','--url',$hostUrl) -WindowStyle Hidden -RedirectStandardError $errorLog -RedirectStandardOutput (Join-Path $runtimeFolder 'tunnel-output.log') -PassThru
    $savedTunnel = @{pid=$newTunnel.Id;path=$cloudflaredPath;start_time=$newTunnel.StartTime.ToUniversalTime().ToString('o');origin=$hostUrl;url=''}
    $savedTunnel | ConvertTo-Json | Set-Content -LiteralPath $tunnelFile -Encoding UTF8
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        $newTunnel.Refresh()
        if ($newTunnel.HasExited) { throw 'Cloudflareとの接続が終了しました。.runtime\tunnel-error.logを確認してください。' }
        $logText = if (Test-Path -LiteralPath $errorLog) { Get-Content -LiteralPath $errorLog -Raw } else { '' }
        $publicUrl = Get-TunnelUrlFromLog $logText
        if ($publicUrl -and $logText -match 'Registered tunnel connection') {
            $savedTunnel.url = $publicUrl
            $savedTunnel | ConvertTo-Json | Set-Content -LiteralPath $tunnelFile -Encoding UTF8
            $publicUrl | Set-Content -LiteralPath $urlFile -Encoding UTF8
            Show-ShareUrl $publicUrl $hostUrl
            exit 0
        }
        Start-Sleep -Seconds 1
    }
    throw '公開URLの発行がタイムアウトしました。.runtime\tunnel-error.logを確認してください。'
} catch {
    $failureMessage = $_.Exception.Message
    if ($ResultFile) { try { @{ok=$false;error=$failureMessage} | ConvertTo-Json | Set-Content -LiteralPath $ResultFile -Encoding UTF8 } catch {} }
    if ($newTunnel) {
        $newTunnel.Refresh()
        if (-not $newTunnel.HasExited) { Stop-RecordedProcess $newTunnel $savedTunnel }
        Remove-Item -LiteralPath $tunnelFile -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $urlFile -ErrorAction SilentlyContinue
    }
    if ($newServer) {
        $newServer.Refresh()
        if (-not $newServer.HasExited) { Stop-RecordedProcess $newServer $savedServer }
        Remove-Item -LiteralPath $serverFile -ErrorAction SilentlyContinue
    }
    Write-Host $failureMessage -ForegroundColor Red
    exit 1
} finally {
    if ($launchLock) { $launchLock.Dispose() }
}
