function Test-RecordedProcess($Process, $Saved) {
    if (-not $Process -or -not $Saved) { return $false }
    return ($Process.Path -eq $Saved.path -and $Process.StartTime.ToUniversalTime().ToString('o') -eq $Saved.start_time)
}

function Get-OwnedProcess($Saved, [string]$ExpectedPath) {
    if (-not $Saved -or $Saved.path -ne $ExpectedPath) { return $null }
    $process = Get-Process -Id $Saved.pid -ErrorAction SilentlyContinue
    if (Test-RecordedProcess $process $Saved) { return $process }
    return $null
}

function Stop-RecordedProcess($Process, $Saved) {
    if (-not (Test-RecordedProcess $Process $Saved)) { throw '記録と異なるプロセスのため停止しませんでした。' }
    & taskkill.exe /PID $Process.Id /T /F | Out-Host
    if ($LASTEXITCODE -ne 0) {
        $Process.Refresh()
        if (-not $Process.HasExited) { throw 'プロセスを停止できませんでした。' }
    }
}

function Get-QuizServerStatus([string]$BaseUrl, [string]$InstanceId) {
    try {
        $reply = Invoke-RestMethod -Uri ($BaseUrl + '/api/health') -TimeoutSec 2
        if ($reply.service -eq 'SENSE' -and $reply.installation_id -eq $InstanceId) { return 'ready' }
    } catch {}
    return 'unavailable'
}

function Get-TunnelUrlFromLog([AllowNull()][AllowEmptyString()][string]$LogText) {
    if ([string]::IsNullOrWhiteSpace($LogText)) { return $null }
    $found = [regex]::Match($LogText, 'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com(?![a-z0-9.-])')
    if ($found.Success) { return $found.Value }
    return $null
}

function Read-LauncherState([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    try { return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json) } catch { return $null }
}

function Get-AvailablePort([int]$PreferredPort = 8000) {
    # Wildcard listeners can coexist with a loopback bind on Windows. Exclude
    # every occupied port before the exclusive bind probe.
    $occupied = @([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | ForEach-Object { $_.Port })
    if ($PreferredPort -lt 8000 -or $PreferredPort -gt 8099) { $PreferredPort = 8000 }
    foreach ($port in @($PreferredPort) + @(8000..8099)) {
        if ($port -in $occupied) { continue }
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
        $listener.ExclusiveAddressUse = $true
        try { $listener.Start(); return $port } catch {} finally { $listener.Stop() }
    }
    throw '起動に使えるポートがありません。他のアプリを終了してからお試しください。'
}
