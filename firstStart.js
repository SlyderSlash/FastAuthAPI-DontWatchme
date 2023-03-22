
const firstStart = (dbapi, dbdata) => {
    dbapi.run(`CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key TEXT NOT NULL,
        calls INTEGER NOT NULL,
        name TEXT
    )`)
    dbapi.run(`CREATE TABLE IF NOT EXISTS api_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key TEXT NOT NULL,
        ip_address REAL NOT NULL,
        timestamp INTEGER
    )`)
    dbdata.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        description INTEGER,
        profilePicture TEXT
    )`)
}

module.exports = firstStart