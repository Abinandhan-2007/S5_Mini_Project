$desktop = [Environment]::GetFolderPath("Desktop")
$projectDir = $PSScriptRoot
if (-not $projectDir) {
    $projectDir = "C:\Users\SIVANAGU\OneDrive\Desktop\s52"
}

$wshell = New-Object -ComObject WScript.Shell

# 1. Start CarePulse Shortcut
$startShortcutPath = Join-Path $desktop "Start CarePulse.lnk"
$startShortcut = $wshell.CreateShortcut($startShortcutPath)
$startShortcut.TargetPath = Join-Path $projectDir "start-carepulse.bat"
$startShortcut.WorkingDirectory = $projectDir
$startShortcut.IconLocation = "$projectDir\carepulse.ico,0"
$startShortcut.Description = "Start CarePulse Android Network Services"
$startShortcut.Save()
Write-Host "Created: $startShortcutPath"

# 2. Stop CarePulse Shortcut
$stopShortcutPath = Join-Path $desktop "Stop CarePulse.lnk"
$stopShortcut = $wshell.CreateShortcut($stopShortcutPath)
$stopShortcut.TargetPath = Join-Path $projectDir "stop-carepulse.bat"
$stopShortcut.WorkingDirectory = $projectDir
$stopShortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,27"
$stopShortcut.Description = "Stop All CarePulse Services"
$stopShortcut.Save()
Write-Host "Created: $stopShortcutPath"
