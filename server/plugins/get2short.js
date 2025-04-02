const config = require('../config');
const axios = require('axios');

const get2short = async (originalUrl, uniqueId) => {
    const aliasMsg = `PirecyKings${uniqueId}`;
    try {
        const respose = await axios.get("https://get2short.com/api", {
            params:{
                api: config.GET2SHORT_API,
                url: originalUrl,
                alias: aliasMsg,
            }
        });

        return respose.data.shortenedUrl || null;
    } catch (error) {
        console.error("URL Sorten error: ", error.message);
        return null;
    }
};

module.exports = get2short;