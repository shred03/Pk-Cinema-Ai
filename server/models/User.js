const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    username: String,
    first_name: String,
    last_name: String,
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);