# 🚀 Deployment Guide for SmartRoute VRP

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐
│  Vercel         │         │  Backend Server  │
│  (Frontend)     │ ◄─────► │  (Python/FastAPI)│
│  Static HTML/JS │   API   │  Port 8000       │
└─────────────────┘         └──────────────────┘
```

## Option 1: Frontend on Vercel + Backend on Render/Railway ✅ RECOMMENDED

### **Step 1: Deploy Backend to Render.com**

1. **Go to [Render.com](https://render.com)** and sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `MRH-66/SmartRoute-VRP`
   - Branch: `feature/osrm-real-routing`

3. **Configure Service**:
   ```
   Name: smartroute-backend
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn api:app --host 0.0.0.0 --port $PORT
   ```

4. **Add Environment Variables**:
   ```
   PYTHON_VERSION=3.10
   ```

5. **Click "Create Web Service"**
   - Render will automatically deploy
   - You'll get a URL like: `https://smartroute-backend.onrender.com`

6. **Test Backend**:
   ```bash
   curl https://smartroute-backend.onrender.com/api/config/default
   ```

### **Step 2: Deploy Frontend to Vercel**

1. **Go to [Vercel.com](https://vercel.com)** and sign in with GitHub

2. **Import Project**
   - Click "Add New..." → "Project"
   - Import `MRH-66/SmartRoute-VRP`
   - Select branch: `feature/osrm-real-routing`

3. **Configure Project**:
   ```
   Framework Preset: Other
   Root Directory: frontend
   Build Command: (leave empty)
   Output Directory: (leave empty)
   Install Command: (leave empty)
   ```

4. **Environment Variables** (Optional):
   ```
   BACKEND_URL=https://smartroute-backend.onrender.com
   ```

5. **Update config.js** BEFORE deploying:
   - Edit `frontend/js/config.js`
   - Replace `YOUR_BACKEND_URL_HERE` with your Render backend URL
   ```javascript
   : 'https://smartroute-backend.onrender.com',  // Your Render URL
   ```

6. **Click "Deploy"**
   - Vercel will build and deploy
   - You'll get a URL like: `https://smartroute-vrp.vercel.app`

### **Step 3: Update Backend CORS**

Edit `api.py` to allow Vercel domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:8000",
        "https://smartroute-vrp.vercel.app",  # Your Vercel domain
        "https://*.vercel.app"  # All Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### **Step 4: Test Everything**

1. Visit your Vercel URL: `https://smartroute-vrp.vercel.app`
2. Open browser DevTools (F12) → Console
3. Check for CORS errors
4. Try adding factory, vehicles, depots
5. Test route optimization

---

## Option 2: All on Render.com (Simpler but Single Service)

### **Deploy Full Stack to Render**

1. **Create requirements.txt** (if not exists):
   ```
   fastapi
   uvicorn
   ortools
   geopy
   requests
   ```

2. **Deploy to Render**:
   - New Web Service → Connect GitHub
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn api:app --host 0.0.0.0 --port $PORT`

3. **Access**:
   - Frontend: `https://your-app.onrender.com/`
   - API: `https://your-app.onrender.com/api/...`

---

## Option 3: Python on Vercel (Experimental) ⚠️

**Limitations**:
- Only serverless functions (no persistent server)
- 10-second timeout per request
- Cold starts
- **NOT RECOMMENDED** for this project (optimization takes >10s)

---

## Quick Commands

### **Commit and Push Changes**:
```bash
cd /home/scientist/Solutyics/VRP

# Add new files
git add vercel.json frontend/js/config.js

# Commit
git commit -m "feat: Add deployment configuration for Vercel"

# Push to GitHub
git push origin feature/osrm-real-routing
```

### **Update Backend URL Later**:
```bash
# Edit config file
nano frontend/js/config.js

# Change YOUR_BACKEND_URL_HERE to actual URL
# Commit and push
git add frontend/js/config.js
git commit -m "update: Configure production backend URL"
git push
```

---

## Recommended Deployment Stack

| Component | Service | Cost | Why |
|-----------|---------|------|-----|
| **Frontend** | Vercel | Free | Fast CDN, auto-deploy from Git |
| **Backend** | Render.com | Free tier | Python support, persistent server |
| **Alternative Backend** | Railway.app | $5/month | Better free tier limits |

---

## After Deployment Checklist

- [ ] Backend is accessible at its URL
- [ ] Frontend loads without errors
- [ ] API calls work (check Network tab)
- [ ] CORS is configured correctly
- [ ] OSRM requests work
- [ ] Optimization completes successfully
- [ ] Maps display correctly
- [ ] CSV/PDF export works

---

## Common Issues & Solutions

### **Issue**: CORS Error
**Solution**: Update `allow_origins` in `api.py` to include Vercel domain

### **Issue**: API calls fail
**Solution**: Check `config.js` has correct backend URL

### **Issue**: Optimization timeout on Render
**Solution**: Upgrade to paid tier or optimize algorithm

### **Issue**: Static files 404
**Solution**: Check `vercel.json` routing configuration

---

## Costs

- **Vercel Free Tier**: ✅ Perfect for this project
  - 100 GB bandwidth/month
  - Unlimited deployments
  
- **Render Free Tier**: ⚠️ Limited
  - Spins down after 15 min inactivity
  - First request takes 30s to wake up
  - Consider $7/month starter tier

---

Ready to deploy? Let me know which option you prefer!
