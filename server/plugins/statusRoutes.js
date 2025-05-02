const express = require('express');
const router = express.Router();
const status = require('./status');


router.get('/', async (req, res) => {
    res.send({botSatus: "Bot is Running.."});
});

router.get('/json', async (req, res) => {
    try {
        const statusData = await status.getStatus();
        const { html, ...jsonData } = statusData;
        res.json(jsonData);
    } catch (error) {
        console.error('Status JSON route error:', error);
        res.status(500).json({
            error: 'Failed to get status',
            message: error.message
        });
    }
});


router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: status.formatUptime(process.uptime())
    });
});

module.exports = router;