const UserRetrievalLimit = require('../models/UserRetrievalLimit');
const verificationSystem = require('./verification');

class FileRetrievalLimitSystem {
    constructor() {
        this.isEnabled = false;
        this.fileLimit = 10; 
        this.resetDuration = 24 * 60 * 60 * 1000;
    }

    toggleSystem() {
        this.isEnabled = !this.isEnabled;
        return this.isEnabled;
    }

    isSystemEnabled() {
        return this.isEnabled;
    }

    setFileLimit(limit) {
        this.fileLimit = Math.max(1, limit); 
        return this.fileLimit;
    }

    getFileLimit() {
        return this.fileLimit;
    }

    async getUserRetrievalRecord(userId) {
        try {
            let record = await UserRetrievalLimit.findOne({ user_id: userId });
            
            if (!record) {
                record = new UserRetrievalLimit({
                    user_id: userId,
                    files_retrieved: 0,
                    last_reset: new Date(),
                    verification_required: false,
                    created_at: new Date()
                });
                await record.save();
            }

            return record;
        } catch (error) {
            console.error('Error getting user retrieval record:', error);
            return null;
        }
    }

    async checkRetrievalLimit(userId) {
        try {
            if (!this.isEnabled) {
                return { allowed: true, remainingFiles: Infinity, needsVerification: false };
            }

            const record = await this.getUserRetrievalRecord(userId);
            if (!record) {
                return { allowed: false, remainingFiles: 0, needsVerification: true, error: 'Failed to get user record' };
            }

            // Check if record needs reset (24 hours passed)
            const now = new Date();
            const timeSinceReset = now.getTime() - record.last_reset.getTime();
            
            if (timeSinceReset >= this.resetDuration) {
                // Reset the counter
                record.files_retrieved = 0;
                record.last_reset = now;
                record.verification_required = false;
                await record.save();
            }

            const remainingFiles = Math.max(0, this.fileLimit - record.files_retrieved);
            const needsVerification = record.verification_required || record.files_retrieved >= this.fileLimit;

            return {
                allowed: !needsVerification,
                remainingFiles,
                needsVerification,
                filesRetrieved: record.files_retrieved,
                nextResetTime: new Date(record.last_reset.getTime() + this.resetDuration)
            };
        } catch (error) {
            console.error('Error checking retrieval limit:', error);
            return { allowed: false, remainingFiles: 0, needsVerification: true, error: error.message };
        }
    }

    async updateFileRetrievalCount(userId, fileCount) {
        try {
            if (!this.isEnabled) return true;

            const record = await this.getUserRetrievalRecord(userId);
            if (!record) return false;

            record.files_retrieved += fileCount;
            
            // Check if user has reached the limit
            if (record.files_retrieved >= this.fileLimit) {
                record.verification_required = true;
            }

            await record.save();
            return true;
        } catch (error) {
            console.error('Error updating file retrieval count:', error);
            return false;
        }
    }

    async resetUserVerificationRequirement(userId) {
        try {
            const record = await this.getUserRetrievalRecord(userId);
            if (!record) return false;

            // Reset verification requirement but keep file count
            record.verification_required = false;
            await record.save();
            return true;
        } catch (error) {
            console.error('Error resetting user verification requirement:', error);
            return false;
        }
    }

    // NEW METHOD: Reset both verification requirement AND file count
    async resetUserFileCount(userId) {
        try {
            const record = await this.getUserRetrievalRecord(userId);
            if (!record) return false;

            // Reset both verification requirement and file count
            record.verification_required = false;
            record.files_retrieved = 0;
            record.last_reset = new Date();
            await record.save();
            
            console.log(`File count and verification reset for user ${userId}`);
            return true;
        } catch (error) {
            console.error('Error resetting user file count:', error);
            return false;
        }
    }

    async handleLimitExceeded(ctx, uniqueId, limitInfo) {
        try {
            const message = this.generateLimitMessage(limitInfo);
            
            // Send verification request
            const verificationSent = await verificationSystem.sendVerificationRequest(
                ctx, 
                uniqueId, 
                ctx.botInfo.username,
                'limit_exceeded'
            );

            if (verificationSent) {
                await ctx.reply(message, { parse_mode: 'Markdown' });
                return true;
            } else {
                await ctx.reply('❌ Failed to send verification request. Please try again later.');
                return false;
            }
        } catch (error) {
            console.error('Error handling limit exceeded:', error);
            await ctx.reply('❌ Error processing your request. Please try again.');
            return false;
        }
    }

    generateLimitMessage(limitInfo) {
        const timeUntilReset = this.getTimeUntilReset(limitInfo.nextResetTime);
        
        return `🚫 **File Retrieval Limit Reached**\n\n` +
               `You have retrieved **${limitInfo.filesRetrieved}/${this.fileLimit}** files in the current cycle.\n\n` +
               `📋 **To continue accessing files:**\n` +
               `• Complete verification using the button below\n` +
               `• After verification, you can retrieve another ${this.fileLimit} files\n\n` +
               `⏰ **Automatic Reset:** ${timeUntilReset}\n\n` +
               `🔐 Click the verification button to continue...`;
    }

    getTimeUntilReset(nextResetTime) {
        const now = new Date();
        const timeLeft = nextResetTime.getTime() - now.getTime();
        
        if (timeLeft <= 0) return 'Available now';
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    async getUserStats(userId) {
        try {
            const record = await this.getUserRetrievalRecord(userId);
            if (!record) return null;

            const limitInfo = await this.checkRetrievalLimit(userId);
            
            return {
                filesRetrieved: record.files_retrieved,
                remainingFiles: limitInfo.remainingFiles,
                fileLimit: this.fileLimit,
                needsVerification: limitInfo.needsVerification,
                nextResetTime: limitInfo.nextResetTime,
                systemEnabled: this.isEnabled
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            return null;
        }
    }

    // UPDATED METHOD: Now resets file count for limit_exceeded context
    async handleVerificationSuccess(userId, context = 'general') {
        try {
            if (context === 'limit_exceeded') {
                // For limit exceeded context, reset both verification and file count
                const success = await this.resetUserFileCount(userId);
                if (success) {
                    console.log(`File count and verification reset for user ${userId} after limit exceeded verification`);
                }
                return success;
            } else {
                // For general verification, just reset verification requirement
                const success = await this.resetUserVerificationRequirement(userId);
                if (success) {
                    console.log(`Verification requirement reset for user ${userId}`);
                }
                return success;
            }
        } catch (error) {
            console.error('Error handling verification success:', error);
            return false;
        }
    }

    // Admin methods
    async getSystemStats() {
        try {
            const totalUsers = await UserRetrievalLimit.countDocuments();
            const usersNeedingVerification = await UserRetrievalLimit.countDocuments({ 
                verification_required: true 
            });
            const avgFilesRetrieved = await UserRetrievalLimit.aggregate([
                { $group: { _id: null, avg: { $avg: '$files_retrieved' } } }
            ]);

            return {
                totalUsers,
                usersNeedingVerification,
                averageFilesRetrieved: avgFilesRetrieved[0]?.avg || 0,
                systemEnabled: this.isEnabled,
                currentFileLimit: this.fileLimit
            };
        } catch (error) {
            console.error('Error getting system stats:', error);
            return null;
        }
    }

    async resetUserLimits(userId = null) {
        try {
            const filter = userId ? { user_id: userId } : {};
            const result = await UserRetrievalLimit.updateMany(filter, {
                files_retrieved: 0,
                verification_required: false,
                last_reset: new Date()
            });

            return {
                success: true,
                modifiedCount: result.modifiedCount,
                message: userId ? `Reset limits for user ${userId}` : `Reset limits for ${result.modifiedCount} users`
            };
        } catch (error) {
            console.error('Error resetting user limits:', error);
            return { success: false, error: error.message };
        }
    }

    // Cleanup expired records (optional maintenance)
    async cleanupOldRecords(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const result = await UserRetrievalLimit.deleteMany({
                last_reset: { $lt: cutoffDate },
                files_retrieved: 0
            });

            console.log(`Cleaned up ${result.deletedCount} old retrieval records`);
            return result.deletedCount;
        } catch (error) {
            console.error('Error cleaning up old records:', error);
            return 0;
        }
    }
}

// Export singleton instance
module.exports = new FileRetrievalLimitSystem();