# Family Travel Tracker

A simple portfolio project that tracks visited countries for different family members using an interactive world map.

This project focuses on **UI state management, backend logic, and database design**, without authentication or sessions, to keep the core functionality clear and intentional.

---

## Live Demo

👉 **Live App:** [https://travel-tracker-6u16.onrender.com/]

---

## Features

* Add multiple family members
* Assign a unique color to each member
* Select a family member via tab-style UI
* Mark visited countries by name
* Countries are highlighted on a world map
* Prevents duplicate country entries per user
* Persistent data using PostgreSQL
* Clean server-rendered UI using EJS

---

## How to Use

* Open the live link
* Select User or add a new one using "Add new member" button
* Enter official name of the country in the input field
* Click "Add" button
* DONE: see the country highlighted on the world map canvas

---


## Tech Stack

**Frontend**

* HTML
* CSS
* Vanilla JavaScript
* HTML Canvas
* EJS templates

**Backend**

* Node.js
* Express.js

**Database**

* PostgreSQL (Neon)

**Hosting**

* Backend: Render
* Database: Neon

---

## Architecture Overview

* Server-rendered Express application
* Forms used instead of client-side fetch for simplicity
* PostgreSQL enforces uniqueness with composite constraints
* Shared demo data (no authentication by design)

---

## Database Design

**users**

* id
* name
* color

**visited_countries**

* user_id
* country_code
* Unique constraint on `(user_id, country_code)`

---

## Why No Authentication?

Authentication and sessions were intentionally excluded to:

* Keep the project focused on core logic
* Avoid unnecessary complexity for a demo
* Highlight backend + database understanding instead

This is a **shared demo environment**.

---

* Demo data may be reset periodically
* This project is intended for portfolio and learning purposes
* No personal data is stored

---

## Future Improvements (Optional)

* User authentication
* Map animations
* Country autocomplete
* Mobile UI polish
* Per-user sessions

---

## Author

Built by **Alok Mishra**
Portfolio project showcasing full-stack fundamentals.

