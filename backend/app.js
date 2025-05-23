import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import pool from './db/db.js';
import productRoutes from './routes/product.route.js';
import rawMaterialRoutes from './routes/rawMaterial.routes.js';
import purchaseOrderRoutes from './routes/purchaseOrder.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import salesOrderRoutes from './routes/salesOrder.routes.js';
import manufacturingStageRoutes from './routes/manufacturingStage.routes.js';
import manufacturingProgressRoutes from './routes/manufacturingProgress.routes.js';
import finishedProductRoutes from './routes/finishedProduct.routes.js';
import revenueAnalysisRoutes from './routes/revenueAnalysis.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import kpiRoutes from './routes/kpi.routes.js';
import companySettingsRoutes from './routes/companySettings.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';

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
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/manufacturing-stages', manufacturingStageRoutes);
app.use('/api/manufacturing-progress', manufacturingProgressRoutes);
app.use('/api/finished-products', finishedProductRoutes);
app.use('/api/revenue-analysis', revenueAnalysisRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/company-settings', companySettingsRoutes);
app.use('/api/purchase', purchaseRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});
 

app.get('/', (req, res) => {
  res.send('Hello World!')
})  

export default app;

