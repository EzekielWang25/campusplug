// ================= IMPORTS =================
const express = require("express");
const fs = require("fs");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcrypt");
const path = require("path");

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

// ================= FILE PATHS =================
const FILES_PATH = path.join(__dirname, "uploads", "files.json");
const USERS_PATH = path.join(__dirname, "users.json");

// ================= HELPER =================
function ensureFileExists(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]");
    }
}

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
    res.render("index");
});

app.get("/test", (req, res) => {
    res.send("SERVER IS WORKING ✅");
});

// ================= SIGNUP =================

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signup", (req, res) => {
    ensureFileExists(USERS_PATH);

    const { username, password, school, department, level } = req.body;

    const users = JSON.parse(fs.readFileSync(USERS_PATH));

    const userExists = users.find(u => u.username === username);

    if (userExists) {
        return res.send("❌ Username already exists");
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {

        users.push({
            username,
            password: hashedPassword,
            school,
            department,
            level
        });

        fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));

        res.send("✅ Signup successful! You can now login.");
    });
});

// ================= LOGIN =================

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    ensureFileExists(USERS_PATH);

    const { username, password } = req.body;

    const users = JSON.parse(fs.readFileSync(USERS_PATH));

    const user = users.find(u => u.username === username);

    if (!user) {
        return res.send("❌ Invalid username or password");
    }

    bcrypt.compare(password, user.password, (err, result) => {
        if (!result) {
            return res.send("❌ Invalid username or password");
        }

        req.session.user = user;
        res.redirect("/dashboard");
    });
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

app.post("/upload", upload.single("pdf"), (req, res) => {
    if (!req.file) {
        return res.send("❌ No file uploaded");
    }

    ensureFileExists(FILES_PATH);

    const user = req.session.user;

    let files = [];

    try {
        files = JSON.parse(fs.readFileSync(FILES_PATH));
    } catch {
        files = [];
    }

    files.push({
        filename: req.file.filename,
        originalname: req.file.originalname,
        school: user.school,
        department: user.department,
        level: user.level,
        uploadedBy: user.username
    });

    fs.writeFileSync(FILES_PATH, JSON.stringify(files, null, 2));

    res.redirect("/files");
});

// ================= VIEW FILES + SEARCH =================

app.get("/files", (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    ensureFileExists(FILES_PATH);

    const user = req.session.user;

    let files = [];

    try {
        files = JSON.parse(fs.readFileSync(FILES_PATH));
    } catch {
        files = [];
    }

    const search = req.query.search || "";
    const department = req.query.department || "";
    const level = req.query.level || "";

    let filteredFiles = files.filter(file => file.school === user.school);

    if (search) {
        filteredFiles = filteredFiles.filter(file =>
            file.originalname.toLowerCase().includes(search.toLowerCase())
        );
    }

    if (department) {
        filteredFiles = filteredFiles.filter(file =>
            file.department.toLowerCase() === department.toLowerCase()
        );
    }

    if (level) {
        filteredFiles = filteredFiles.filter(file =>
            file.level.toLowerCase() === level.toLowerCase()
        );
    }

    res.render("files", {
        files: filteredFiles,
        search,
        department,
        level
    });
});

// ================= PORT =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});