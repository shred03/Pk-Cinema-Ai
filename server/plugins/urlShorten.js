const config = require('../config');
const axios = require('axios');

const shrinkme = async (originalUrl, uniqueId) => {
    const aliasMsg = `pirecykings${uniqueId}`;
    try {
        const respose = await axios.get("https://shrinkme.io/api", {
            params:{
                api: config.SHRINKME_API,
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

module.exports = shrinkme;