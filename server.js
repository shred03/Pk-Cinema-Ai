const express = require("express")
require('dotenv').config();

const app = express();

app.get("/", async(req, res) => {
    res.send({
        status: "Link is active and running"
    });
})

app.get("/pirecykings/:uniqueId", async (req, res) =>{
    try {
        const {uniqueId} = req.params;
        const botUsername = process.env.BOT_USERNAME
        return res.redirect(`https://t.me/${botUsername}?start=${uniqueId}`)
    } catch (error) {
        console.error('Redirect error:', error);
        return res.status(500).send('Server error');
    }
})

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Health check server is running on port ${PORT}`);
});