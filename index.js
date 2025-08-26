import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import multer from "multer";
import "dotenv/config";
import Sentiment from "sentiment";

// AI generations
import { generateMemoryPrompt } from "./utils/memoryPrompt.js";
import { generatePhotoPrompt } from "./utils/photoPrompt.js";

const app = express();
const port = process.env.PORT || 3000;

import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // e.g. ".png"
    const uniqueName = "photo-" + Date.now() + ext;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

const sentiment = new Sentiment();

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("public/uploads"));

let currentUserId = 1;
let started = false;

let users = [];

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

async function getVisitedDetails() {
  const result = await db.query(
    `SELECT country_code, notes, photo_path
     FROM visited_countries
     WHERE user_id = $1`,
    [currentUserId]
  );
  return result.rows.map((row) => {
    const isBase64 = row.photo_path?.startsWith("data:image");
    return {
      code: row.country_code,
      note: row.notes,
      photo: isBase64
        ? row.photo_path
        : row.photo_path
        ? "/" + row.photo_path
        : null,
    };
  });
}

app.get("/", (req, res) => {
  res.render("cover.ejs");
});

app.get("/index", async (req, res) => {
  if (!started) {
    await db.query("DELETE FROM visited_countries");
    await db.query("DELETE FROM users");
    started = true;
    res.render("index.ejs", {
      countries: [],
      total: 0,
      users: [],
      color: "#f2f2f2",
      error: "Please create a user first.",
      currentUser: [],
      countryDetails: [],
    });
    return;
  }
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();
  const countryDetails = await getVisitedDetails();
  if (!currentUser) {
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: "#f2f2f2",
      error: "Please select or create a user first.",
      currentUser,
      countryDetails,
    });
    return;
  }
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
    currentUser,
    countryDetails,
  });
});

app.get("/gallery", async (req, res) => {
  const currentUser = await getCurrentUser();
  const result = await db.query(
    `SELECT country_code, notes, photo_path
     FROM visited_countries
     WHERE user_id = $1`,
    [currentUserId]
  );

  const memories = result.rows.map((row) => {
    const isBase64 = row.photo_path?.startsWith("data:image");
    return {
      country: row.country_code,
      note: row.notes,
      photo: isBase64 ? row.photo_path : "/" + row.photo_path
    };
  });

  res.render("gallery.ejs", {
    currentUser,
    memories
  });
});

app.post("/add", upload.single("photo"), async (req, res) => {
  if (users.length === 0) {
    res.redirect("/index");
    return;
  }
  const input = req.body["country"];
  let notes = req.body["notes"];
  const photo = req.file;
  const currentUser = await getCurrentUser();

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    const data = result.rows[0];
    const countryCode = data.country_code;

    // 🧠 Generate AI memory prompt if notes are empty
    if (!notes || notes.trim() === "") {
      try {
        notes = await generateMemoryPrompt(input);
      } catch (err) {
        console.log("AI prompt failed:", err);
        notes = null;
      }
    }

    // 🧠 Analyze sentiment of the note
    let tone = "neutral"; // default

    if (notes && notes.trim() !== "") {
      const result = sentiment.analyze(notes);
      const score = result.score;

      if (score > 3) tone = "joyful";
      else if (score < -3) tone = "melancholic";
    }

    // 🧠 Generate AI photo prompt if photo is empty
    let photoPath = null;

    if (!photo) {
      try {
        const imageBlob = await generatePhotoPrompt(input, notes, tone); // this returns a Blob
        const arrayBuffer = await imageBlob.arrayBuffer(); // convert Blob to ArrayBuffer
        const buffer = Buffer.from(arrayBuffer); // convert ArrayBuffer to Node.js Buffer
        const base64Image = buffer.toString("base64"); // convert Buffer to base64 string
        photoPath = `data:image/png;base64,${base64Image}`; // final image string
      } catch (err) {
        console.log("AI image prompt failed:", err);
      }
    } else {
      photoPath = "uploads/" + photo.filename;
    }

    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id, notes, photo_path) VALUES ($1, $2, $3, $4);",
        [countryCode, currentUser.id, notes || null, photoPath]
      );
      res.redirect("/index");
    } catch (err) {
      console.log(err);
      const countries = await checkVisisted();
      res.render("index.ejs", {
        countries: countries,
        users: users,
        total: countries.length,
        color: currentUser.color,
        error: "Country has already been added, try again.",
        currentUser,
        countryDetails: [],
      });
    }
  } catch (err) {
    console.log(err);
    const countries = await checkVisisted();
    res.render("index.ejs", {
      countries: countries,
      users: users,
      total: countries.length,
      color: currentUser.color,
      error: "Country name does not exist, try again.",
      currentUser,
      countryDetails: [],
    });
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/index");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  if (users.find((user) => user.name === name)) {
    res.render("new.ejs", { error: "User name already exists, choose again" });
    return;
  }

  const data = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  const id = data.rows[0].id;
  currentUserId = id;

  res.redirect("/index");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
