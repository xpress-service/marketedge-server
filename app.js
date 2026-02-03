import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://marketedge-dashboard.vercel.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Google Sheets Authentication
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;


 // Helper function to parse spreadsheet data
const parseSheetData = (rows) => {
  if (!rows || rows.length === 0) return {};
  const data = {};
  
  // Data starts at row 6 (index 5), location is in column B (index 1)
  for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[1] && row[1].trim()) {
      const location = row[1].trim();
      data[location] = {
        location: location,
        weeklyTarget: parseFloat((row[2] || "0").toString().replace(/,/g, "").trim()),
        weeklyActual: parseFloat((row[3] || "0").toString().replace(/,/g, "").trim()),
        dailyTarget: parseFloat((row[5] || "0").toString().replace(/,/g, "").trim()),
        dailyActual: parseFloat((row[6] || "0").toString().replace(/,/g, "").trim()),
      };
    }
  }
  
  return data;
};

app.get("/api/locations", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Revenue!A1:H20",
    });

    const rows = response.data.values;
    const locationData = parseSheetData(rows);

    res.json({
      success: true,
      data: locationData,
      locations: Object.keys(locationData),
    });
  } catch (err) {
    console.error("Error fetching data:", err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      message: "Failed to fetch location data from Google Sheets"
    });
  }
});

app.get("/api/locations/:name", async (req, res) => {
  try {
    const locationName = req.params.name;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Revenue!A1:H20",
    });

    const rows = response.data.values;
    const locationData = parseSheetData(rows);

    if (locationData[locationName]) {
      res.json({
        success: true,
        data: locationData[locationName],
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Location '${locationName}' not found`,
      });
    }
  } catch (err) {
    console.error("Error fetching location data:", err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

app.post("/api/locations", async (req, res) => {
  const {
    location,
    weeklyTarget,
    weeklyActual,
    dailyTarget,
    dailyActual,
  } = req.body;

  // Validation
  if (!location) {
    return res.status(400).json({
      success: false,
      message: "Location name is required",
    });
  }

  try {
    //fetch existing data to find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:H",
    });

    const rows = response.data.values;
    let rowIndex = -1;

    // Find the location row 
    for (let i = 5; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === location) {
        rowIndex = i + 1; 
        break;
      }
    }

    if (rowIndex === -1) {
      // Location not found, append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A:H",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            location,
            "", // placeholder
            weeklyTarget || "",
            weeklyActual || "",
            "", 
            dailyTarget || "",
            dailyActual || "",
          ]],
        },
      });

      res.json({
        success: true,
        message: `Location '${location}' added successfully`,
      });
    } else {
      // Update existing row
      const updateRange = `Sheet1!C${rowIndex}:G${rowIndex}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            weeklyTarget || "",
            weeklyActual || "",
            "", 
            dailyTarget || "",
            dailyActual || "",
          ]],
        },
      });

      res.json({
        success: true,
        message: `Location '${location}' updated successfully`,
      });
    }
  } catch (err) {
    console.error("Error updating data:", err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      message: "Failed to update location data"
    });
  }
});

app.put("/api/locations/batch", async (req, res) => {
  const { locations } = req.body;

  if (!locations || !Array.isArray(locations)) {
    return res.status(400).json({
      success: false,
      message: "Locations array is required",
    });
  }

  try {
    const updatePromises = locations.map(loc => 
      // batch update logic be can implemented here
      Promise.resolve()
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `${locations.length} locations updated successfully`,
    });
  } catch (err) {
    console.error("Error batch updating:", err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

app.get("/api/debug", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Revenue!A1:H20",
    });
    res.json({
      success: true,
      rowCount: response.data.values?.length || 0,
      rows: response.data.values,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Google Sheets ID: ${SPREADSHEET_ID ? "Configured" : "Not configured"}`);
  console.log(`Credentials: ${process.env.GOOGLE_CLIENT_EMAIL ? "Loaded" : "Missing"}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
