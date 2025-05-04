import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import pool from './db/db.js';
import productRoutes from './routes/product.route.js';
import rawMaterialRoutes from './routes/rawMaterial.routes.js';

dotenv.config();

const app = express();


app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Routes`
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/raw-materials', rawMaterialRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});
 

app.get('/', (req, res) => {
  res.send('Hello World!')
})  

export default app;

