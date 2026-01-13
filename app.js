import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

env.config();

// connect to the database
const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// --- MULTI-USER SUPPORT (kept names) ---
let currentUserId = 1;
let users = [
    { id: 1, name: "Jane", color: "teal" },
    { id: 2, name: "Jack", color: "powderblue" },
];

async function getCurrentUser() {
    // refresh users list from DB so UI shows newly created users
    try {
        const result = await db.query("SELECT * FROM users ORDER BY id;");
        users = result.rows.length ? result.rows : users; // fallback to in-memory if DB empty
    } catch (err) {
        console.error("Failed loading users from DB:", err);
    }
    // return the current user object (may be from DB or fallback list)
    return users.find((u) => u.id == currentUserId);
}

async function checkVisisted() {  //function to check visited countries
    // restrict visited countries to the current user
    const result = await db.query(
        "SELECT country_code FROM visited_countries WHERE user_id = $1;",  //the table visited_countries already stores user_id, so no need to JOIN with users table
        [currentUserId]
    );

    let countries = [];
    result.rows.forEach((country) => {
        countries.push(country.country_code); //pushing country_code from every country object in result.rows to countries array
    });
    return countries;
}

// Route to render the main page
app.get("/", async (req, res) => {
    const countries = await checkVisisted(); //checkVisited returns an array of visited countries_code
    const currentUser = await getCurrentUser();
    res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users,
        color: currentUser ? currentUser.color : "gray",
        currentUserId,
    });
});

// Route to add a new country
app.post("/add", async (req, res) => {
    const raw = req.body["country"] || "";
    const input = raw.trim();

    const currentUser = await getCurrentUser();

    // guard against empty input
    if (!input) {
        const countries = await checkVisisted();
        return res.render("index.ejs", {
            countries: countries,
            total: countries.length,
            error: "Please enter a country name",
            users,
            color: currentUser ? currentUser.color : "gray",
            currentUserId,
        });
    }

    try {
        // 1. Try exact match (case-insensitive)
        let result = await db.query(
            "SELECT country_code FROM countries WHERE LOWER(country_name) = LOWER($1) LIMIT 1;",
            [input]
        );

        // 2. If no exact match, try whole-word match using regex to avoid partial hits like 'Indian' matching 'India'
        if (!result.rows.length) {
            // \m and \M mark start and end of word in Postgres regex
            result = await db.query(
                "SELECT country_code FROM countries WHERE country_name ~* ('\\\\m' || $1 || '\\\\M') LIMIT 1;",
                [input]
            );
        }

        // If still no match, show error
        if (!result.rows.length) {
            const countries = await checkVisisted();
            return res.render("index.ejs", {
                countries: countries,
                total: countries.length,
                error: "Country not found",
                users,
                color: currentUser ? currentUser.color : "gray",
                currentUserId,
            });
        }

        const countryCode = result.rows[0].country_code;

        // 3. Insert the country_code into visited_countries for the current user
        try {
            const result = await db.query(         //backticks because of multi-line query, quotes for single line
                `INSERT INTO visited_countries (country_code, user_id)  
                VALUES ($1, $2)
                ON CONFLICT (user_id, country_code) DO NOTHING
                RETURNING country_code;`,
                [countryCode, currentUserId]
            );

            if (result.rowCount === 0) {
                // Country already visited
                const countries = await checkVisisted(currentUserId);

                return res.render("index.ejs", {
                    countries,
                    total: countries.length,
                    error: "Country already visited",
                    users,
                    color: currentUser ? currentUser.color : "gray",
                    currentUserId,
                });
            }

            // New country added
            return res.redirect("/");

        } catch (err) {
            console.error("Insert error:", err);

            const countries = await checkVisisted(currentUserId);

            return res.render("index.ejs", {
                countries,
                total: countries.length,
                error: "Could not add country (DB error)",
                users,
                color: currentUser ? currentUser.color : "gray",
                currentUserId,
            });
        }




    } catch (err) {
        console.error(err);
        const countries = await checkVisisted();
        const currentUserAgain = await getCurrentUser();
        return res.render("index.ejs", {
            countries: countries,
            total: countries.length,
            error: "Country lookup failed",
            users,
            color: currentUserAgain ? currentUserAgain.color : "gray",
            currentUserId,
        });
    }
});

// Route to switch or add users
app.post("/user", async (req, res) => {
    if (req.body.add === "new") {    //
        return res.render("new.ejs");
    } else if (req.body.user) {
        currentUserId = parseInt(req.body.user, 10) || currentUserId; //switch user
        return res.redirect("/");
    }
    return res.redirect("/");
});

// Create new user and switch to them
app.post("/new", async (req, res) => {
    const name = req.body.name || "Unnamed";
    const color = req.body.color || "gray";

    // try catch is not really necessary here, but added to handle potential DB errors, 
    const result = await db.query(
        "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;", //returning all columns of the newly created user
        [name, color]
    );
    const id = result.rows[0].id;
    currentUserId = id;
    return res.redirect("/");

});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
