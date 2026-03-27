const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    school: String,
    department: String,
    level: String
});

module.exports = mongoose.model("User", userSchema);