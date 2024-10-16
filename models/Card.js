const mongoose = require("mongoose");

const CardSchema = new mongoose.Schema({
  name: { type: String, required: false },
  jobTitle: { type: String, required: false },
  companyName: { type: String, required: false },
  email: { type: String, required: false },
  phone: { type: String, required: false },
  address: { type: String, required: false },
  timestamp: { type: Date, default: Date.now },
});

const Card = mongoose.model("Card", CardSchema);
module.exports = Card;
