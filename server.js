const express = require("express")
require('dotenv').config();

const app = express();

app.get("/", async(req, res) => {
    res.send({
        status: "Link is active and running"
    });
})

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Health check server is running on port ${PORT}`);
});