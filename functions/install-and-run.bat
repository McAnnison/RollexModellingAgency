@echo off
echo Installing dependencies...
npm install
echo.
echo Starting server...
echo.
echo Make sure to create a .env file with your MongoDB URI and JWT_SECRET
echo Copy .env.example to .env and update the values
echo.
node index.js
