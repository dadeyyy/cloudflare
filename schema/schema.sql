

DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    refreshToken TEXT,
    lastModified INTEGER DEFAULT (strftime('%s', 'now'))  -- Using UNIX timestamp
);

-- Insert users into the table
INSERT INTO users (username, password, refreshToken) VALUES
('andrei', 'lazo', 'rt1'),
('cheka', 'roxas', 'rt2');