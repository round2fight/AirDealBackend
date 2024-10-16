require("dotenv").config();
const express = require("express");

const multer = require("multer");

const path = require("path");

const Tesseract = require("tesseract.js");

const mongoose = require("mongoose");
const fs = require("fs");
const app = express();

app.use(express.static(path.join(__dirname + "/uploads")));

app.set("view engine", "ejs");
// ss
const dbURI = process.env.MONGODB_URI || "mongodb://localhost:27017/airdeal";
mongoose
  .connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

const Card = require("./models/Card");

// ss

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

const cors = require("cors");

// Enable CORS to allow communication with the frontend
app.use(cors());

// Configure Multer for file upload

// API endpoint to handle image upload and OCR processing
app.get("/ping", async (req, res) => {
  try {
    res.status(200).json({ pong: "pong" });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/cards", async (req, res) => {
  try {
    const cards = await Card.find();
    res.status(200).json(cards);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/cards", async (req, res) => {
  try {
    const result = await Card.deleteMany({});
    res.status(200).json({ cards_deleted_count: result.deletedCount });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/cards/:id", async (req, res) => {
  const cardId = req.params.id; // Get the ID from the URL parameters

  try {
    const result = await Card.findByIdAndDelete(cardId);
    if (!result) {
      return res.status(404).json({ message: "Card not found." });
    }
    res.status(200).json({ message: "Card deleted successfully." });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/upload", upload.single("image"), async (req, res) => {
  const imagePath = req.file.path;

  try {
    Tesseract.recognize(imagePath, "eng")
      .then(async (text) => {
        console.log("Result:", text);

        // Initialize an object to store extracted fields
        const extractedData = {
          name: "",
          jobTitle: "",
          companyName: "",
          email: "",
          phone: "",
          address: "",
        };

        // Regex patterns for extracting information
        const namePattern = /Name:\s*(.*)/i;
        const jobTitlePattern = /Title:\s*(.*)/i;
        const companyNamePattern = /Company:\s*(.*)/i;
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const phonePattern =
          /(?:\+?(\d{1,3}))?[-.\s]?(\d{1,4})[-.\s]?(\d{1,4})[-.\s]?(\d{1,9})/;
        const addressPattern = /Address:\s*(.*)/i;

        // Extracting data using regex patterns
        const nameMatch = text["data"]["text"].match(namePattern);
        const jobTitleMatch = text["data"]["text"].match(jobTitlePattern);
        const companyNameMatch = text["data"]["text"].match(companyNamePattern);
        const emailMatch = text["data"]["text"].match(emailPattern);
        const phoneMatch = text["data"]["text"].match(phonePattern);
        const addressMatch = text["data"]["text"].match(addressPattern);

        if (nameMatch) extractedData.name = nameMatch[1].trim();
        if (jobTitleMatch) extractedData.jobTitle = jobTitleMatch[1].trim();
        if (companyNameMatch)
          extractedData.companyName = companyNameMatch[1].trim();
        if (emailMatch) extractedData.email = emailMatch[0].trim();
        if (phoneMatch) extractedData.phone = phoneMatch[0].trim();
        if (addressMatch) extractedData.address = addressMatch[1].trim();

        const newCard = new Card(extractedData);
        await newCard.save();
        fs.unlinkSync(imagePath);
        res.json(extractedData);
      })
      .catch((error) => {
        console.log(error.message);
      });

    // Send the extracted data back to the frontend
  } catch (error) {
    console.error("OCR processing failed:", error);
    res.status(500).json({ error: "OCR processing failed." });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
