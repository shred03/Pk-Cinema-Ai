require('dotenv').config();

const config = {
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    TMDB_BASE_URL: 'https://api.themoviedb.org/3'
}

module.exports = config;