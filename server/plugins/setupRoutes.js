const express = require('express');
const statusRoutes = require('./statusRoutes');

const setupStatus = (app) => {
   
    app.use('/status', statusRoutes);
    
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString()
        });
    });
};

module.exports = setupStatus;