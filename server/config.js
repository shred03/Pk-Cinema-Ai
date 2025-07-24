require('dotenv').config();

const config = {
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    TMDB_BASE_URL: 'https://api.themoviedb.org/3',
    BOT_TOKEN: process.env.BOT_TOKEN,
    ADMIN_IDS: process.env.ADMIN_IDS,
    DATABASE_FILE_CHANNELS: process.env.DATABASE_FILE_CHANNELS,
    FORCE_CHANNEL_ID: process.env.FORCE_CHANNEL_ID,
    FORCE_CHANNEL_USERNAME: process.env.FORCE_CHANNEL_USERNAME || 'PirecyKings3',
    AUTO_DELETE_FILES: process.env.AUTO_DELETE_FILES === 'true',
    AUTO_DELETE_TIME: parseInt(process.env.AUTO_DELETE_TIME) || 7,
    LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID,
    SHRINKME_API: process.env.SHRINKME_API,
    BOT_USERNAME: process.env.BOT_USERNAME,
    REDIRECT_DOMAIN: process.env.REDIRECT_DOMAIN,

}

module.exports = config;