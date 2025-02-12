const mongoose = require('mongoose');
const AdminSchema = new mongoose.Schema({
    admin_id: Number,
    custom_caption: String,
    caption_enabled: { type: Boolean, default: true }
});

const Admin = mongoose.model('Admin', AdminSchema);
module.exports = Admin;