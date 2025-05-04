# Backend Server

This is the backend server for the application, built with Node.js and Express.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
NODE_ENV=development
```

## Running the Server

- For development (with auto-reload):
```bash
npm run dev
```

- For production:
```bash
npm start
```

The server will run on port 5000 by default (or the port specified in your .env file). 