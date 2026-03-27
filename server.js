// ================= IMPORTS =================
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcrypt");
const path = require("path");
const mongoose = require("mongoose");

// ================= APP SETUP =================
const app = express();

// VIEW ENGINE
app.set("view engine", "ejs");

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: true
}));

// ================= DATABASE =================

// 🔥 REPLACE WITH YOUR REAL URL
const MONGO_URL = "mongodb+srv://EzekielWang:<db_password>@campusplug.rt3jbxw.mongodb.net/?appName=CampusPlug";

mongoose.connect(MONGO_URL)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ MongoDB ERROR:", err));

// ================= MODELS =================

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    school: String,
    department: String,
    level: String
});

const User = mongoose.model("User", userSchema);

const fileSchema = new mongoose.Schema({
    filename: String,
    originalname: String,
    school: String,
    department: String,
    level: String,
    uploadedBy: String
});

const File = mongoose.model("File", fileSchema);

// ================= FILE UPLOAD =================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "uploads"));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// SERVE UPLOADS
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= ROUTES =================

// HOME
app.get("/", (req, res) => {
    try {
        res.render("index");
    } catch {
        res.send("CampusPlug LIVE 🚀");
    }
});

// TEST ROUTE
app.get("/test", (req, res) => {
    res.send("SERVER IS WORKING ✅");
});

// ================= SIGNUP =================

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signup", async (req, res) => {
    try {
        const { username, password, school, department, level } = req.body;

        const userExists = await User.findOne({ username });

        if (userExists) {
            return res.send("❌ Username already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            password: hashedPassword,
            school,
            department,
            level
        });

        await newUser.save();

        res.send("✅ Signup successful!");
    } catch (err) {
        console.log("Signup Error:", err);
        res.send("❌ Signup failed");
    }
});

// ================= LOGIN =================

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user) {
            return res.send("❌ Invalid username");
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.send("❌ Wrong password");
        }

        req.session.user = user;
        res.redirect("/dashboard");
    } catch (err) {
        console.log("Login Error:", err);
        res.send("❌ Login failed");
    }
});

// ================= DASHBOARD =================

app.get("/dashboard", (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    res.render("dashboard", { user: req.session.user });
});

// ================= LOGOUT =================

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// ================= UPLOAD =================

app.get("/upload", (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    res.render("upload");
});

app.post("/upload", upload.single("pdf"), async (req, res) => {
    try {
        if (!req.file) return res.send("❌ No file uploaded");

        const user = req.session.user;

        const newFile = new File({
            filename: req.file.filename,
            originalname: req.file.originalname,
            school: user.school,
            department: user.department,
            level: user.level,
            uploadedBy: user.username
        });

        await newFile.save();

        res.redirect("/files");
    } catch (err) {
        console.log("Upload Error:", err);
        res.send("❌ Upload failed");
    }
});

// ================= VIEW FILES =================

app.get("/files", async (req, res) => {
    try {
        if (!req.session.user) return res.redirect("/login");

        const user = req.session.user;

        const search = req.query.search || "";
        const department = req.query.department || "";
        const level = req.query.level || "";

        let files = await File.find({ school: user.school });

        if (search) {
            files = files.filter(f =>
                f.originalname.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (department) {
            files = files.filter(f =>
                f.department.toLowerCase() === department.toLowerCase()
            );
        }

        if (level) {
            files = files.filter(f =>
                f.level.toLowerCase() === level.toLowerCase()
            );
        }

        res.render("files", {
            files,
            search,
            department,
            level
        });
    } catch (err) {
        console.log("Files Error:", err);
        res.send("❌ Failed to load files");
    }
});

// ================= ERROR HANDLER =================

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Server error 😢");
});

// ================= PORT =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});