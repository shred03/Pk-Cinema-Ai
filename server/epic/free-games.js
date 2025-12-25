const axios = require('axios');
const cron = require('node-cron');
const Epic = require('../models/Epic');

const EPIC_API_URL = 'https://epci-games-scraper.vercel.app/api/epic/free-games';

class EpicGamesService {
    constructor(bot) {
        this.bot = bot;
        this.activeChats = new Map(); // In-memory cache
        this.isInitialized = false;
        this.epicRecord = null;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Check if Epic record exists, if not create one
            let epicRecord = await Epic.findOne();
            if (!epicRecord) {
                const currentGame = await this.fetchCurrentGame();
                epicRecord = new Epic({
                    lastPostedGameSlug: currentGame ? currentGame.productSlug : 'initial',
                    activeChatIds: [],
                    deactiveChatIds: []
                });
                await epicRecord.save();
                console.log('✅ Epic Games tracker initialized');
            }

            this.epicRecord = epicRecord;

            // Load active chats from database into memory
            if (epicRecord.activeChatIds && epicRecord.activeChatIds.length > 0) {
                epicRecord.activeChatIds.forEach(chatId => {
                    this.activeChats.set(chatId, true);
                });
                console.log(`✅ Loaded ${epicRecord.activeChatIds.length} active chats from database`);
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing Epic Games service:', error);
        }
    }

    async fetchCurrentGame() {
        try {
            const response = await axios.get(EPIC_API_URL, { timeout: 10000 });
            if (response.data.success && response.data.data.length > 0) {
                // Get the first active game
                const activeGame = response.data.data.find(game => game.status === 'ACTIVE');
                return activeGame || response.data.data[0];
            }
            return null;
        } catch (error) {
            console.error('Error fetching Epic Games data:', error.message);
            return null;
        }
    }

    formatGameMessage(game) {
        const timeRemaining = game.timeRemaining?.humanReadable || 'Unknown';
        const [days, hours, minutes] = timeRemaining.match(/\d+/g);
        const formattedTime = `${days} Day ${hours} Hour ${minutes} Minute`;

        const expiryDate = new Date(game.expiryDate).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });


        return `
<b>${game.title}</b>

<blockquote>${game.description}</blockquote>

<b>Time Remaining:</b> <code>${formattedTime}</code>
<b>Expires:</b> <code>${expiryDate}</code>
<b>Original Price:</b> <code>Free (Limited Time)</code>

<blockquote><b><i>Claim Now:</i></b> <a href="${game.url}">Get it on Epic Games Store</a></blockquote>

#FreeGame #EpicGames ~ <a href="https://t.me/chihirr0">@chihiro</a>`;
    }

    async sendGameNotification(chatId, game) {
        const imageUrl = game.images.landscape || game.images.portrait;

        try {
            // Try sending as photo with URL
            await this.bot.telegram.sendPhoto(
                chatId,
                { url: imageUrl },
                {
                    caption: this.formatGameMessage(game),
                    parse_mode: 'HTML'
                }
            );
            return true;
        } catch (error) {
            console.error(`Error sending photo for ${game.title}:`, error.message);

            // Fallback: Send as message with clickable image link
            try {
                const messageWithLink = `🎮 <b>${game.title}</b>\n\n` +
                    `<a href="${imageUrl}">📸 View Game Image</a>\n\n` +
                    this.formatGameMessage(game);

                await this.bot.telegram.sendMessage(
                    chatId,
                    messageWithLink,
                    { parse_mode: 'HTML', disable_web_page_preview: false }
                );
                return true;
            } catch (fallbackError) {
                console.error('Fallback message also failed:', fallbackError.message);
                return false;
            }
        }
    }

    async activateChat(chatId) {
        await this.initialize();

        // Convert chatId to string for consistency
        const chatIdStr = chatId.toString();

        // Add to in-memory map
        this.activeChats.set(chatIdStr, true);

        // Update database - add to activeChatIds and remove from deactiveChatIds
        try {
            await Epic.updateOne(
                {},
                {
                    $addToSet: { activeChatIds: chatIdStr }, // Add to active list (no duplicates)
                    $pull: { deactiveChatIds: chatIdStr }    // Remove from deactive list
                }
            );
            console.log(`✅ Chat ${chatIdStr} activated and saved to database`);
        } catch (error) {
            console.error('Error saving active chat to database:', error);
        }

        // Send current free game immediately
        const currentGame = await this.fetchCurrentGame();
        if (currentGame) {
            const sent = await this.sendGameNotification(chatId, currentGame);

            if (sent) {
                return {
                    success: true,
                    message: '✅ Epic Games notifications activated! You\'ll receive updates when new free games are available.',
                    game: currentGame
                };
            } else {
                return {
                    success: false,
                    message: '❌ Failed to send game information. Please try again.'
                };
            }
        } else {
            return {
                success: false,
                message: '❌ Could not fetch current free games. Please try again later.'
            };
        }
    }

    async deactivateChat(chatId) {
        // Convert chatId to string for consistency
        const chatIdStr = chatId.toString();

        // Remove from in-memory map
        this.activeChats.delete(chatIdStr);

        // Update database - remove from activeChatIds and add to deactiveChatIds
        try {
            await Epic.updateOne(
                {},
                {
                    $pull: { activeChatIds: chatIdStr },      // Remove from active list
                    $addToSet: { deactiveChatIds: chatIdStr } // Add to deactive list (no duplicates)
                }
            );
            console.log(`✅ Chat ${chatIdStr} deactivated and saved to database`);
        } catch (error) {
            console.error('Error saving deactive chat to database:', error);
        }

        return {
            success: true,
            message: '✅ Epic Games notifications deactivated for this chat.'
        };
    }

    isActivated(chatId) {
        return this.activeChats.has(chatId.toString());
    }

    async checkAndNotifyNewGames() {
        await this.initialize();

        if (this.activeChats.size === 0) {
            console.log('ℹ️ No active chats to notify');
            return;
        }

        try {
            const currentGame = await this.fetchCurrentGame();
            if (!currentGame) {
                console.log('⚠️ No game data available from API');
                return;
            }

            const epicRecord = await Epic.findOne();
            if (!epicRecord) {
                console.error('❌ Epic record not found in database');
                return;
            }

            // Check if this is a new game
            if (epicRecord.lastPostedGameSlug !== currentGame.productSlug) {
                console.log(`🆕 New free game detected: ${currentGame.title}`);

                // Update the database with new game slug
                epicRecord.lastPostedGameSlug = currentGame.productSlug;
                await epicRecord.save();

                // Notify all active chats
                const notificationPromises = Array.from(this.activeChats.keys()).map(async (chatId) => {
                    try {
                        const sent = await this.sendGameNotification(chatId, currentGame);
                        if (sent) {
                            console.log(`✅ Sent notification to chat ${chatId}`);
                        }
                    } catch (error) {
                        console.error(`❌ Failed to send to chat ${chatId}:`, error.message);
                        // If chat is inaccessible, deactivate it
                        if (error.response?.error_code === 403 || error.response?.error_code === 400) {
                            console.log(`🗑️ Removing inaccessible chat ${chatId}`);
                            await this.deactivateChat(chatId);
                        }
                    }
                });

                await Promise.allSettled(notificationPromises);
                console.log(`✅ Notifications sent to ${this.activeChats.size} active chats`);
            } else {
                console.log(`ℹ️ Same game (${currentGame.title}), no notifications sent`);
            }
        } catch (error) {
            console.error('Error in checkAndNotifyNewGames:', error);
        }
    }

    startCronJob() {
        // Check every 2 hours for new games
        cron.schedule('* * * * *', async () => {
            console.log('🔍 Checking for new Epic Games free games...');
            await this.checkAndNotifyNewGames();
        });

        console.log('✅ Epic Games cron job started (checks every 2 hours)');
    }

    async getStats() {
        await this.initialize();
        const epicRecord = await Epic.findOne();

        return {
            activeChats: this.activeChats.size,
            activeChatIds: epicRecord?.activeChatIds || [],
            deactiveChatIds: epicRecord?.deactiveChatIds || [],
            lastPostedGame: epicRecord?.lastPostedGameSlug || 'None',
            isInitialized: this.isInitialized
        };
    }

    async syncFromDatabase() {
        // Utility method to manually sync in-memory state from database
        await this.initialize();
        const epicRecord = await Epic.findOne();

        if (epicRecord && epicRecord.activeChatIds) {
            this.activeChats.clear();
            epicRecord.activeChatIds.forEach(chatId => {
                this.activeChats.set(chatId, true);
            });
            console.log(`🔄 Synced ${epicRecord.activeChatIds.length} active chats from database`);
        }
    }
}

module.exports = EpicGamesService;