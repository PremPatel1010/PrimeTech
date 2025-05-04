import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import http from 'http';
import app from './app.js';

dotenv.config();


const PORT = process.env.PORT || 5000;
const server = http.createServer(app);



// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
