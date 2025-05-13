# PrimeTech Manufacturing Management System Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Backend API Documentation](#backend-api-documentation)
4. [Database Models](#database-models)
5. [Frontend Components](#frontend-components)
6. [Authentication & Authorization](#authentication--authorization)
7. [Setup and Installation](#setup-and-installation)

## Project Overview

PrimeTech Manufacturing Management System is a comprehensive solution designed to streamline manufacturing operations, manage inventory, track production progress, and analyze business performance. The system consists of a modern React frontend and a Node.js/Express backend.

### Key Features
- Sales Order Management
- Manufacturing Progress Tracking
- Inventory Management
- Supplier Management
- Purchase Order Processing
- Revenue Analysis
- Real-time Notifications
- User Authentication and Authorization

## System Architecture

The system follows a modern client-server architecture:

### Frontend
- Built with React and TypeScript
- Uses Vite as the build tool
- Implements Tailwind CSS for styling
- Component-based architecture

### Backend
- Node.js with Express.js
- MongoDB database
- RESTful API architecture
- JWT-based authentication

## Backend API Documentation

### Authentication Routes
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Sales Order Routes
- `GET /api/sales-orders` - Get all sales orders
- `POST /api/sales-orders` - Create new sales order
- `GET /api/sales-orders/:id` - Get specific sales order
- `PUT /api/sales-orders/:id` - Update sales order
- `DELETE /api/sales-orders/:id` - Delete sales order

### Manufacturing Progress Routes
- `GET /api/manufacturing-progress` - Get all manufacturing progress entries
- `POST /api/manufacturing-progress` - Create new progress entry
- `GET /api/manufacturing-progress/:id` - Get specific progress entry
- `PUT /api/manufacturing-progress/:id` - Update progress entry

### Product Routes
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `GET /api/products/:id` - Get specific product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Raw Material Routes
- `GET /api/raw-materials` - Get all raw materials
- `POST /api/raw-materials` - Create new raw material
- `GET /api/raw-materials/:id` - Get specific raw material
- `PUT /api/raw-materials/:id` - Update raw material
- `DELETE /api/raw-materials/:id` - Delete raw material

### Purchase Order Routes
- `GET /api/purchase-orders` - Get all purchase orders
- `POST /api/purchase-orders` - Create new purchase order
- `GET /api/purchase-orders/:id` - Get specific purchase order
- `PUT /api/purchase-orders/:id` - Update purchase order
- `DELETE /api/purchase-orders/:id` - Delete purchase order

### Supplier Routes
- `GET /api/suppliers` - Get all suppliers
- `POST /api/suppliers` - Create new supplier
- `GET /api/suppliers/:id` - Get specific supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Notification Routes
- `GET /api/notifications` - Get all notifications
- `POST /api/notifications` - Create new notification
- `PUT /api/notifications/:id` - Mark notification as read

### Revenue Analysis Routes
- `GET /api/revenue-analysis` - Get revenue analysis data
- `GET /api/revenue-analysis/summary` - Get revenue summary

## Database Models

### User Model
- username: String (required)
- email: String (required, unique)
- password: String (required)
- role: String (enum: ['admin', 'manager', 'worker'])
- createdAt: Date
- updatedAt: Date

### Sales Order Model
- orderNumber: String (required, unique)
- customer: Object (required)
- products: Array of Product references
- totalAmount: Number
- status: String (enum: ['pending', 'processing', 'completed', 'cancelled'])
- createdAt: Date
- updatedAt: Date

### Manufacturing Progress Model
- orderId: Reference to Sales Order
- stage: String
- status: String
- startDate: Date
- completionDate: Date
- notes: String
- createdAt: Date
- updatedAt: Date

### Product Model
- name: String (required)
- description: String
- specifications: Object
- price: Number
- category: String
- stock: Number
- createdAt: Date
- updatedAt: Date

### Raw Material Model
- name: String (required)
- description: String
- quantity: Number
- unit: String
- supplier: Reference to Supplier
- createdAt: Date
- updatedAt: Date

### Purchase Order Model
- orderNumber: String (required, unique)
- supplier: Reference to Supplier
- materials: Array of Raw Material references
- totalAmount: Number
- status: String
- createdAt: Date
- updatedAt: Date

### Supplier Model
- name: String (required)
- contact: Object
- address: Object
- products: Array of Product references
- createdAt: Date
- updatedAt: Date

### Notification Model
- title: String (required)
- message: String (required)
- type: String
- recipient: Reference to User
- read: Boolean
- createdAt: Date

### Revenue Analysis Model
- period: String
- revenue: Number
- expenses: Number
- profit: Number
- createdAt: Date
- updatedAt: Date

## Frontend Components

The frontend is organized into several key components:

### Pages
- Dashboard
- Sales Orders
- Manufacturing Progress
- Products
- Raw Materials
- Purchase Orders
- Suppliers
- Notifications
- Revenue Analysis

### Common Components
- Navigation
- Sidebar
- Header
- Forms
- Tables
- Charts
- Modals
- Alerts

## Authentication & Authorization

The system implements JWT-based authentication with role-based access control:

### Roles
- Admin: Full system access
- Manager: Access to most features except user management
- Worker: Limited access to assigned tasks and progress updates

### Security Features
- Password hashing
- JWT token expiration
- Role-based route protection
- Input validation
- XSS protection

## Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file with the following variables:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   ```

4. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file with the following variables:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## API Response Format

All API responses follow a standard format:

```json
{
  "success": true/false,
  "data": {}, // Response data
  "message": "Success/Error message",
  "error": {} // Error details if any
}
```

## Error Handling

The system implements comprehensive error handling:

1. Validation Errors
2. Authentication Errors
3. Authorization Errors
4. Database Errors
5. Server Errors

Each error type returns appropriate HTTP status codes and error messages.

## Best Practices

1. Always use HTTPS in production
2. Keep dependencies updated
3. Follow the established code style
4. Write unit tests for new features
5. Document API changes
6. Regular database backups
7. Monitor system performance

## Support and Maintenance

For support and maintenance:
1. Regular system updates
2. Database maintenance
3. Performance monitoring
4. Security patches
5. User training and documentation updates

## Future Enhancements

Planned future enhancements:
1. Real-time updates using WebSocket
2. Mobile application
3. Advanced analytics
4. Integration with external systems
5. Automated reporting
6. Enhanced security features 