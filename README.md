# Backend Server Setup Guide

## Overview
This Node/Express backend connects to Google Sheets to fetch and update location data for the Kaihma Assessment Dashboard.

## Production URLs
- **Backend API:** https://marketedge-server.onrender.com
- **Frontend Dashboard:** https://marketedge-dashboard.vercel.app

## Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Google Cloud Console account
- Access to the target Google Spreadsheet

---

## Step 1: Install Dependencies

Navigate to the server directory and install required packages:

```bash
cd server
npm install
```

---

## Step 2: Google Cloud Console Setup

### 2.1 Create/Select a Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

### 2.2 Enable Google Sheets API
1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click **Enable**

### 2.3 Create Service Account
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in details:
   - Service account name: `kaihma-sheets-access` (or any name)
   - Description: "Access to Kaihma assessment spreadsheet"
4. Click **Create and Continue**
5. Skip optional steps (Grant access & Grant users access)
6. Click **Done**

### 2.4 Create and Download Key
1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. Click **Create** - the JSON file will download automatically
6. **IMPORTANT:** Keep this file secure and never commit it to version control

### 2.5 Share Spreadsheet with Service Account
1. Open the JSON file you downloaded
2. Copy the `client_email` value (looks like: `name@project.iam.gserviceaccount.com`)
3. Open your Google Spreadsheet
4. Click **Share** button (top right)
5. Paste the service account email
6. Give it **Editor** permissions
7. Click **Send**

---

## Step 3: Configure Environment Variables

### 3.1 Create .env file
In the `server` directory, create a `.env` file:

```bash
cp .env.example .env
```

### 3.2 Fill in the credentials
Open `.env` and update with values from your downloaded JSON file:

```env
PORT=5000

# Your spreadsheet ID (from the URL)
SPREADSHEET_ID=14x3rW5wwajfUi319U5ldGTN5lFf4lXh5wHvnPAcesQ0

# From the JSON file's "client_email" field
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# From the JSON file's "private_key" field (keep the quotes and \n characters)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour actual private key here...\n-----END PRIVATE KEY-----\n"
```

**Tips for GOOGLE_PRIVATE_KEY:**
- Copy the entire `private_key` value from the JSON file
- Keep it wrapped in double quotes
- Keep the `\n` characters as they are
- It should look like: `"-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...rest of key...\n-----END PRIVATE KEY-----\n"`

---

## Step 4: Verify Spreadsheet Structure

Make sure your Google Sheet has this structure (starting from row 1):

| Row | Column A  | Column B | Column C (TARGET) | Column D (ACTUAL) | Column E | Column F (TARGET) | Column G (ACTUAL) |
|-----|-----------|----------|-------------------|-------------------|----------|-------------------|-------------------|
| 1   |           |          |                   |                   |          |                   |                   |
| 2   |           | WEEK DATA|                   |                   |          | TODAY'S DATA      |                   |
| 3   |           |          |                   |                   |          |                   |                   |
| 4   |           | TARGET   | ACTUAL            |                   | TARGET   | ACTUAL            |                   |
| 5   | LOCATION  | Week 6: 1st - 7th Feb |                   |          | 7th Feb           |                   |
| 6   | OMOLE     | 11,773,820.45 | 13,539,893.52 |          | 1,681,974.35 | 1,934,270.50 |                   |
| 7   | GWARIMPA-ABUJA | ... | ... |          | ... | ... |                   |

---

## Step 5: Start the Server

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000` (development) or `https://marketedge-server.onrender.com` (production)

You should see output like:
```
Server running on port 5000
Google Sheets ID: Configured
Credentials: Loaded
```

---

## API Endpoints

### 1. Health Check
```
GET /api/health
```
Response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

### 2. Get All Locations
```
GET /api/locations
```
Response:
```json
{
  "success": true,
  "data": {
    "OMOLE": {
      "location": "OMOLE",
      "weeklyTarget": 11773820.45,
      "weeklyActual": 13539893.52,
      "dailyTarget": 1681974.35,
      "dailyActual": 1934270.50
    },
    ...
  },
  "locations": ["OMOLE", "GWARIMPA-ABUJA", ...]
}
```

### 3. Get Specific Location
```
GET /api/locations/:name
```
Example: `GET /api/locations/OMOLE`

Response:
```json
{
  "success": true,
  "data": {
    "location": "OMOLE",
    "weeklyTarget": 11773820.45,
    "weeklyActual": 13539893.52,
    "dailyTarget": 1681974.35,
    "dailyActual": 1934270.50
  }
}
```

### 4. Add/Update Location Data
```
POST /api/locations
Content-Type: application/json

{
  "location": "OMOLE",
  "weeklyTarget": 12000000,
  "weeklyActual": 13000000,
  "dailyTarget": 1700000,
  "dailyActual": 1900000
}
```

Response:
```json
{
  "success": true,
  "message": "Location 'OMOLE' updated successfully"
}
```

---

## Testing the API

### Using curl:
```bash
# Test health (local)
curl http://localhost:5000/api/health
# Or production:
curl https://marketedge-server.onrender.com/api/health

# Get all locations (local)
curl http://localhost:5000/api/locations
# Or production:
curl https://marketedge-server.onrender.com/api/locations

# Get specific location
curl http://localhost:5000/api/locations/OMOLE

# Add/Update location (POST)
curl -X POST http://localhost:5000/api/locations \
  -H "Content-Type: application/json" \
  -d '{"location":"OMOLE","weeklyTarget":12000000,"weeklyActual":13000000,"dailyTarget":1700000,"dailyActual":1900000}'
```

### Using Postman or Thunder Client:
1. Create a new request
2. Set method to GET/POST
3. Enter URL: `http://localhost:5000/api/locations`
4. For POST requests, add JSON body in the Body tab

---

## Troubleshooting

### Error: "Failed to fetch location data from Google Sheets"
- Check if Google Sheets API is enabled
- Verify service account has access to the spreadsheet
- Check if SPREADSHEET_ID is correct
- Ensure credentials in .env are correct

### Error: "GOOGLE_CLIENT_EMAIL is undefined"
- Make sure .env file exists in the server directory
- Verify .env file has correct format (no extra spaces)
- Restart the server after editing .env

### Error: "Invalid grant"
- The private key might be incorrectly formatted
- Make sure to keep the \n characters in GOOGLE_PRIVATE_KEY
- Verify the service account email is correct

### Port already in use
- Change PORT in .env to another value (e.g., 5001)
- Or kill the process using the port

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` file to version control
- Never commit service account JSON files
- Keep your credentials secure
- Add `.env` and `*.json` to `.gitignore` (already done)

---

## Next Steps

To connect your React frontend to this backend:

1. Update the `data.jsx` file to fetch from API instead of hardcoded data
2. Use `fetch` or `axios` to call the endpoints
3. Example:
```javascript
// For production:
const response = await fetch('https://marketedge-server.onrender.com/api/locations');
const { data } = await response.json();

// For local development:
// const response = await fetch('http://localhost:5000/api/locations');
```

---

## Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure the spreadsheet structure matches the expected format
4. Check that the service account has Editor access to the sheet
