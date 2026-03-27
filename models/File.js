const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    filename: String,
    originalname: String,
    school: String,
    department: String,
    level: String,
    uploadedBy: String
});

module.exports = mongoose.model("File", fileSchema);