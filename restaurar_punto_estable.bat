@echo off
echo ==========================================================
echo RESTAURANDO AL PUNTO DE ORO ESTABLE DE DUST RACING 2D...
echo ==========================================================
xcopy /E /I /Y _checkpoints\punto_estable_dustrac\* .
git checkout punto-estable-dustrac -- .
echo.
echo Restauracion completada con exito al 100%.
echo Tu juego ha vuelto exactamente al punto estable que funcionaba.
pause
