#!/usr/bin/env python3
"""
SmartRoute - Employee Transport Optimizer
Startup script for the FastAPI application
"""

import uvicorn
import os
import sys
from pathlib import Path

def main():
    """Main function to start the SmartRoute application"""
    
    # Ensure we're in the correct directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print("🚀 Starting SmartRoute - Employee Transport Optimizer")
    print("=" * 60)
    print("📍 Factory Location Management")
    print("🚗 Vehicle Fleet Configuration")
    print("🏢 Employee PickupSpot Setup")
    print("🗺️  Route Optimization with OR-Tools")
    print("=" * 60)
    
    # Configuration
    host = "127.0.0.1"
    port = 8000
    
    print(f"🌐 Server will start at: http://{host}:{port}")
    print(f"📂 Static files served from: {script_dir}/frontend")
    print("=" * 60)
    print("Press Ctrl+C to stop the server")
    print()
    
    try:
        # Start the FastAPI server
        uvicorn.run(
            "api:app",
            host=host,
            port=port,
            reload=True,  # Auto-reload on code changes
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n👋 SmartRoute server stopped")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()