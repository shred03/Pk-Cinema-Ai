const mongoose = require('mongoose');

const userVerificationSchema = new mongoose.Schema({
    user_id: {
        type: Number,
        required: true,
        unique: true
    },
    verification_token: {
        type: String,
        required: true,
        unique: true
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    verified_at: {
        type: Date,
        default: null
    },
    expires_at: {
        type: Date,
        default: null
    },
    context: {
        type: String,
        default: 'general',
        enum: ['general', 'limit_exceeded']
    },
     unique_id: {
        type: String,
        default: null 
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});
userVerificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('UserVerification', userVerificationSchema);