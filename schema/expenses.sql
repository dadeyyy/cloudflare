DROP TABLE IF EXISTS expenses;


CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    date_created TEXT DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO expenses (user_id, category, amount) VALUES
(1, 'grocery', 5000),
(1, 'gym', 800),
(2, 'transpo', 1500);