@echo off
:: Script para crear un acceso directo del Sistema Medico en el Escritorio

set "SCRIPT_DIR=%~dp0"
set "TARGET=%SCRIPT_DIR%index.html"
set "SHORTCUT=%USERPROFILE%\Desktop\Sistema Medico.lnk"

echo Creando acceso directo en: %SHORTCUT%
echo Ruta del sistema: %TARGET%

echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%SHORTCUT%" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%TARGET%" >> CreateShortcut.vbs
echo oLink.Description = "Sistema Medico Digital" >> CreateShortcut.vbs
:: Utiliza el icono por defecto de internet o carpeta (shell32 14 es un globo o 131 un hospital si aplicara)
echo oLink.IconLocation = "shell32.dll, 14" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

cscript /nologo CreateShortcut.vbs
del CreateShortcut.vbs

echo.
echo ========================================================
echo ACCESO DIRECTO CREADO CON EXITO EN TU ESCRITORIO.
echo Ahora puedes cerrar esta ventana.
echo ========================================================
pause
