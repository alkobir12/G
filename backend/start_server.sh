#!/bin/bash

# Workshop Management API Startup Script

echo "🔧 Starting Workshop Management API..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with the following variables:"
    echo "MONGO_URL=mongodb://localhost:27017"
    echo "EMERGENT_LLM_KEY=your_ai_key_here"
    exit 1
fi

# Initialize database if needed
echo "📊 Checking database initialization..."
python init_data.py

# Start the server
echo "🚀 Starting FastAPI server..."
uvicorn server:app --host 0.0.0.0 --port 8000 --reload

echo "✅ Workshop Management API is running on http://localhost:8000"
echo "📖 API Documentation: http://localhost:8000/docs"