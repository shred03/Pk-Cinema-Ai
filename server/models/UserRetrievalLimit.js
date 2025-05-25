const mongoose = require('mongoose');

const userRetrievalLimitSchema = new mongoose.Schema({
    user_id: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    files_retrieved: {
        type: Number,
        default: 0,
        min: 0
    },
    last_reset: {
        type: Date,
        default: Date.now,
        index: true
    },
    verification_required: {
        type: Boolean,
        default: false,
        index: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

userRetrievalLimitSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

userRetrievalLimitSchema.index({ user_id: 1, verification_required: 1 });
userRetrievalLimitSchema.index({ last_reset: 1, files_retrieved: 1 });

const UserRetrievalLimit = mongoose.model('UserRetrievalLimit', userRetrievalLimitSchema);

module.exports = UserRetrievalLimit;