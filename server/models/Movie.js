const mongoose = require('mongoose');

const moviePostSchema = new mongoose.Schema({
    postId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    adminId: {
        type: Number,
        required: true,
        index: true
    },
    movieName: {
        type: String,
        required: true
    },
    movieId: {
        type: Number,
        required: true
    },
    channelId: {
        type: String,
        required: true
    },
    channelUsername: {
        type: String,
        default: null
    },
    messageId: {
        type: Number,
        required: true
    },
    downloadLinks: [{
        type: String,
        required: true
    }],
    movieData: {
        type: Object,
        required: true
    },
    posterUrl: {
        type: String,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

moviePostSchema.index({ adminId: 1, createdAt: -1 });
moviePostSchema.index({ postId: 1, adminId: 1 });

moviePostSchema.statics.createMoviePost = async function(postData) {
    try {
        const moviePost = new this(postData);
        return await moviePost.save();
    } catch (error) {
        throw error;
    }
};

moviePostSchema.statics.findByPostId = async function(postId) {
    try {
        return await this.findOne({ postId, isActive: true });
    } catch (error) {
        throw error;
    }
};

moviePostSchema.statics.findByAdminId = async function(adminId, limit = 10) {
    try {
        return await this.find({ adminId, isActive: true })
            .sort({ createdAt: -1 })
            .limit(limit);
    } catch (error) {
        throw error;
    }
};

moviePostSchema.statics.updateDownloadLinks = async function(postId, downloadLinks) {
    try {
        return await this.findOneAndUpdate(
            { postId, isActive: true },
            { downloadLinks, updatedAt: new Date() },
            { new: true }
        );
    } catch (error) {
        throw error;
    }
};

moviePostSchema.statics.deactivatePost = async function(postId) {
    try {
        return await this.findOneAndUpdate(
            { postId },
            { isActive: false },
            { new: true }
        );
    } catch (error) {
        throw error;
    }
};

moviePostSchema.statics.cleanupOldPosts = async function() {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return await this.updateMany(
            { createdAt: { $lt: thirtyDaysAgo } },
            { isActive: false }
        );
    } catch (error) {
        throw error;
    }
};

module.exports = mongoose.model('MoviePost', moviePostSchema);