import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
const { Pool } = pg;

env.config();

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});


const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


let currentUserId = 1;
let users = [
    { id: 1, name: "Jane", color: "teal" },
    { id: 2, name: "Jack", color: "powderblue" },
];

async function getCurrentUser() {

    try {
        const result = await db.query("SELECT * FROM users ORDER BY id;");
        users = result.rows.length ? result.rows : users;
    } catch (err) {
        console.error("Failed loading users from DB:", err);
    }

    return users.find((u) => u.id == currentUserId);
}

async function checkVisisted() {

    const result = await db.query(
        "SELECT country_code FROM visited_countries WHERE user_id = $1;",
        [currentUserId]
    );

    let countries = [];
    result.rows.forEach((country) => {
        countries.push(country.country_code);
    });
    return countries;
}


app.get("/", async (req, res) => {
    const countries = await checkVisisted();
    const currentUser = await getCurrentUser();
    res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users,
        color: currentUser ? currentUser.color : "gray",
        currentUserId,
    });
});


app.post("/add", async (req, res) => {
    const raw = req.body["country"] || "";
    const input = raw.trim();

    const currentUser = await getCurrentUser();


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

        let result = await db.query(
            "SELECT country_code FROM countries WHERE LOWER(country_name) = LOWER($1) LIMIT 1;",
            [input]
        );


        if (!result.rows.length) {

            result = await db.query(
                "SELECT country_code FROM countries WHERE country_name ~* ('\\\\m' || $1 || '\\\\M') LIMIT 1;",
                [input]
            );
        }


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


        try {
            const result = await db.query(
                `INSERT INTO visited_countries (country_code, user_id)  
                VALUES ($1, $2)
                ON CONFLICT (user_id, country_code) DO NOTHING
                RETURNING country_code;`,
                [countryCode, currentUserId]
            );

            if (result.rowCount === 0) {

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


            return res.redirect("/");

        } catch (err) {
            console.error("Insert error:", err);

            const countries = await checkVisisted(currentUserId);

            return res.render("index.ejs", {
                countries,
                total: countries.length,
                error: "Please select a User and try again (DB error)",
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


app.post("/user", async (req, res) => {
    if (req.body.add === "new") {    //
        return res.render("new.ejs");
    } else if (req.body.user) {
        currentUserId = parseInt(req.body.user, 10) || currentUserId;
        return res.redirect("/");
    }
    return res.redirect("/");
});


app.post("/new", async (req, res) => {
    const name = req.body.name || "Unnamed";
    const color = req.body.color || "gray";

    const result = await db.query(
        "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
        [name, color]
    );
    const id = result.rows[0].id;
    currentUserId = id;
    return res.redirect("/");

});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
