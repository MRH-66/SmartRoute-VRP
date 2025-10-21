# 📍 SmartRoute Location Guide

## How to Add Locations in SmartRoute

There are **4 different ways** to add factory and pickup_spot locations in SmartRoute:

---

## 🗺️ **Method 1: Interactive Map (Recommended)**

### For Factory Location:
1. Go to **Factory** tab in the application
2. **Click anywhere on the map** where your factory is located
3. Enter factory name in the form
4. Click **"Save Factory"** or **"Set Factory Location"**
5. Factory appears as a **red marker** 🏭 on the map

### For PickupSpot Locations:
1. Go to **PickupSpots** tab
2. **Click on the map** for each pickup point
3. Enter pickup_spot name (e.g., "Shalimar", "DHA Phase 5")
4. Enter number of workers at that location
5. Click **"Add PickupSpot"**
6. PickupSpot appears as a **blue marker** 📍 on the map

---

## 📍 **Method 2: Manual Coordinate Entry**

### When to Use:
- You have exact GPS coordinates
- Using Google Maps coordinates
- Need precise location placement

### Steps:
1. In the **Factory** or **PickupSpots** tab, find the coordinate input fields
2. Enter **Latitude** and **Longitude** (decimal format)
3. Enter location name and worker count (for pickup_spots)
4. Click **"Save Factory"** or **"Add PickupSpot"**

### Coordinate Examples:
```
Lahore City Center: 31.520400, 74.358700
Karachi Center: 24.860700, 67.001100
Islamabad Center: 33.684400, 73.047900
```

---

## 📱 **Method 3: Using Google Maps Coordinates**

### Step-by-Step:
1. **Open Google Maps** on your phone/computer
2. **Search** for your location or **long-press** on the map
3. **Copy coordinates** that appear (format: 31.520400, 74.358700)
4. **Paste** into SmartRoute manual coordinate fields

### Finding Coordinates in Google Maps:
- **Desktop**: Right-click → "What's here?" → Copy coordinates
- **Mobile**: Long-press → Coordinates appear at bottom → Tap to copy

---

## 🎯 **Location Tips & Best Practices**

### ✅ **Factory Location Tips:**
- Choose central, accessible location
- Consider traffic patterns for vehicle access
- Ensure adequate parking space for fleet
- Should be reachable from all pickup_spot areas

### ✅ **PickupSpot Location Tips:**
- Select residential areas where employees live
- Group nearby employees into single pickup_spots
- Consider road accessibility for vehicles
- Account for peak hour traffic conditions
- Typical worker counts: 10-30 per pickup_spot

### ✅ **Coordinate Accuracy:**
- Use **6 decimal places** for best accuracy (~1 meter precision)
- Example: `31.520400` not `31.52`
- Validate coordinates are within your city/region

---

## 🚨 **Common Issues & Solutions**

### **"PickupSpot with this name already exists"**
- **Solution**: Use unique names (add area suffix: "Main Market - Gulberg")

### **"Click on map not working"**
- **Solution**: Zoom in more, ensure good internet connection
- **Alternative**: Use manual coordinate entry

### **"Wrong location selected"**
- **Solution**: Delete location and re-add, or edit coordinates manually

### **"Factory not showing on map"**
- **Solution**: Refresh page, check if coordinates are valid

---

## 🔄 **Editing Existing Locations**

### **Edit Factory:**
1. Go to **Factory** tab
2. Click **"Clear Factory"** or **"Edit Factory"** button
3. Re-enter coordinates or click new location on map
4. Save changes

### **Edit PickupSpots:**
1. Go to **PickupSpots** tab
2. Find the pickup_spot in the list
3. Click **"Edit"** button next to the pickup_spot
4. Modify name, worker count, or location
5. Click **"Save Changes"**

### **Delete Locations:**
- **PickupSpots**: Click **"Delete"** button next to the pickup_spot in the list
- **Factory**: Click **"Clear Factory"** button in Factory tab

---

## 📊 **Sample Data for Testing**

If you want to test the application quickly, use these sample coordinates:

### **Factory Options:**
```
Main Factory Lahore: 31.520400, 74.358700
Industrial Estate: 31.469700, 74.272800
Sundar Industrial: 31.569700, 74.302800
```

### **PickupSpot Options:**
```
Shalimar: 31.604500, 74.356700 (25 workers)
DHA Phase 5: 31.469700, 74.407800 (18 workers)  
Gulberg: 31.520300, 74.344100 (22 workers)
Model Town: 31.483300, 74.328600 (15 workers)
Johar Town: 31.451100, 74.261100 (30 workers)
```

---

## 🚀 **Next Steps After Adding Locations**

1. **Verify on Map**: Check that all markers appear correctly
2. **Add Vehicles**: Go to **Vehicles** tab and add your fleet
3. **Review Configuration**: Ensure factory, vehicles, and pickup_spots are all set
4. **Run Optimization**: Go to **Optimization** tab
5. **Click "Optimize Routes"**: Generate optimal routes
6. **View Routes on Map**: See color-coded routes connecting factory to pickup_spots

Need help with any specific location or having issues? The application shows helpful error messages! 🤝

---

**Last Updated**: October 2025
**Application**: SmartRoute VRP Optimizer v3.0