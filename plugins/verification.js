const crypto = require('crypto');
const UserVerification = require('../models/UserVerification');
const shrinkme = require('./urlShorten');
const { Markup } = require('telegraf');

class VerificationSystem {
    constructor() {
        this.isEnabled = false;
        this.verificationDuration = 12 * 60 * 60 * 1000;
    }

    toggleVerification() {
        this.isEnabled = !this.isEnabled;
        return this.isEnabled;
    }

    isVerificationEnabled() {
        return this.isEnabled;
    }

    generateVerificationToken(userId, context = 'general') {
        return crypto.createHash('sha256')
            .update(`${userId}_${context}_${Date.now()}_${Math.random()}`)
            .digest('hex')
            .substring(0, 16);
    }

    async isUserVerified(userId) {
        try {
            const verification = await UserVerification.findOne({
                user_id: userId,
                is_verified: true,
                expires_at: { $gt: new Date() }
            });
            return !!verification;
        } catch (error) {
            console.error('Error checking user verification:', error);
            return false;
        }
    }
    async createVerificationRecord(userId, context = 'general', uniqueId = null) {
        try {
            const token = this.generateVerificationToken(userId, context);

            await UserVerification.findOneAndUpdate(
                { user_id: userId },
                {
                    user_id: userId,
                    verification_token: token,
                    is_verified: false,
                    verified_at: null,
                    expires_at: null,
                    context: context,
                    unique_id: uniqueId,
                    created_at: new Date()
                },
                { upsert: true, new: true }
            );

            return token;
        } catch (error) {
            console.error('Error creating verification record:', error);
            return null;
        }
    }
    async verifyUserByToken(token) {
        try {
            const verification = await UserVerification.findOne({
                verification_token: token,
                is_verified: false
            });

            if (!verification) {
                return { success: false, message: 'Invalid or expired verification token' };
            }

            const now = new Date();
            const expiresAt = new Date(now.getTime() + this.verificationDuration);

            await UserVerification.updateOne(
                { verification_token: token },
                {
                    is_verified: true,
                    verified_at: now,
                    expires_at: expiresAt
                }
            );
            return {
                success: true,
                message: 'Verification successful! You can now access files for the next 12 hours.',
                userId: verification.user_id,
                context: verification.context,
                uniqueId: verification.unique_id
            };
        } catch (error) {
            console.error('Error verifying user:', error);
            return { success: false, message: 'Verification failed due to server error' };
        }
    }
    async sendVerificationRequest(ctx, uniqueId, botUsername, context = 'general') {
        try {
            const token = await this.createVerificationRecord(ctx.from.id, context, uniqueId);
            if (!token) {
                await ctx.reply('❌ Failed to generate verification. Please try again.');
                return false;
            }

            const verificationUrl = `https://t.me/${botUsername}?start=verify_${token}`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url('🔗 Complete Verification', verificationUrl)],
                [Markup.button.callback('🔄 I\'ve completed verification', `verify_check_${uniqueId}`)]
            ]);

            let messageText;
            if (context === 'limit_exceeded') {
                messageText = `🚫 **File Retrieval Limit Exceeded**\n\n` +
                    `You need to complete verification to continue accessing files.\n\n` +
                    `⌛ Generating verification link...`;
            } else {
                messageText = `🔐 **Verification Required**\n\n` +
                    `To access the files, please complete verification by clicking the button below:\n\n` +
                    `⌛ Generating short URL...`;
            }
            const initialMessage = await ctx.reply(messageText, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            shrinkme(verificationUrl, token).then(shortUrl => {
                const finalUrl = shortUrl || verificationUrl;
                const updatedKeyboard = Markup.inlineKeyboard([
                    [Markup.button.url('🔗 Complete Verification', finalUrl)],
                    [Markup.button.callback('🔄 I\'ve completed verification', `verify_check_${uniqueId}`)]
                ]);

                let finalMessageText;
                if (context === 'limit_exceeded') {
                    finalMessageText = `🚫 **File Retrieval Limit Exceeded**\n\n` +
                        `You need to complete verification to continue accessing files.\n\n` +
                        `🔗 **Verification Link:** \`${finalUrl}\`\n\n` +
                        `✅ After clicking the link, press "I've completed verification" button.`;
                } else {
                    finalMessageText = `🔐 **Verification Required**\n\n` +
                        `To access the files, please complete verification by clicking the button below:\n\n` +
                        `🔗 **Verification Link:** \`${finalUrl}\`\n\n` +
                        `✅ After clicking the link, press "I've completed verification" button.`;
                }
                ctx.telegram.editMessageText(
                    ctx.chat.id,
                    initialMessage.message_id,
                    null,
                    finalMessageText,
                    {
                        parse_mode: 'Markdown',
                        ...updatedKeyboard
                    }
                ).catch(err => console.error('Failed to update verification message:', err));
            });
            return true;
        } catch (error) {
            console.error('Error sending verification request:', error);
            await ctx.reply('❌ Failed to send verification. Please try again.');
            return false;
        }
    }
    async markUserAsVerified(userId) {
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + this.verificationDuration);

            const result = await UserVerification.findOneAndUpdate(
                { user_id: userId },
                {
                    is_verified: true,
                    verified_at: now,
                    expires_at: expiresAt
                },
                { new: true }
            );

            return !!result;
        } catch (error) {
            console.error('Error marking user as verified:', error);
            return false;
        }
    }
    async handleVerificationCheck(ctx, uniqueId) {
        try {
            const isVerified = await this.isUserVerified(ctx.from.id);

            if (!isVerified) {
                await ctx.answerCbQuery('❌ Please complete verification first by clicking the verification link.');
                return false;
            }

            await ctx.answerCbQuery('✅ Verification confirmed!');
            await ctx.deleteMessage();

            await ctx.telegram.sendMessage(ctx.chat.id, `/start ${uniqueId}`);
            return true;
        } catch (error) {
            console.error('Error handling verification check:', error);
            await ctx.answerCbQuery('❌ Error checking verification status.');
            return false;
        }
    }
    async cleanupExpiredVerifications() {
        try {
            const result = await UserVerification.deleteMany({
                expires_at: { $lt: new Date() }
            });
            console.log(`Cleaned up ${result.deletedCount} expired verifications`);
        } catch (error) {
            console.error('Error cleaning up expired verifications:', error);
        }
    }
}
module.exports = new VerificationSystem();