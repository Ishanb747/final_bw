@echo off
cd /d c:\projects\TruthLens-ext
if exist web rmdir /s /q web
echo Creating Vite app...
call npm create vite@latest web -- --template react-ts
cd web
echo Installing dependencies...
call npm install
echo Installing Tailwind...
call npm install -D tailwindcss postcss autoprefixer
call npx tailwindcss init -p
echo Installing App dependencies...
call npm install firebase react-router-dom lucide-react clsx tailwind-merge
echo Done!
