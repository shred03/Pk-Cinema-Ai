const { Markup } = require('telegraf');
const File = require('../models/File');

const EXCLUDE_WORDS = [
'[PK]', '[PirecyKings]', '[A14]'
];

class SearchSystem {
    constructor() {
        this.resultsPerPage = 10;
        this.authorizedChats = this.loadAuthorizedChats();
    }

    loadAuthorizedChats() {
        const authorizedChatsEnv = process.env.AUTHORIZED_CHAT;
        if (!authorizedChatsEnv) {
            console.warn('AUTHORIZED_CHAT environment variable not set');
            return [];
        }
        
        const chats = authorizedChatsEnv.split(',').map(chatId => chatId.trim());
        console.log('Loaded authorized chats:', chats);
        return chats;
    }

    isAuthorizedChat(chatId) {
        const chatIdStr = chatId.toString();
        const chatIdNum = parseInt(chatId);
        
        // For groups, Telegram sometimes uses different formats:
        // -1004869390080 (full format) vs -4869390080 (short format)
        // We need to check both formats
        const shortFormat = chatIdStr.replace(/^-100/, '-');
        const fullFormat = chatIdStr.startsWith('-') && !chatIdStr.startsWith('-100') ? 
                          '-100' + chatIdStr.substring(1) : chatIdStr;
        
        const isAuthorized = this.authorizedChats.includes(chatIdStr) || 
                           this.authorizedChats.includes(chatIdNum.toString()) ||
                           this.authorizedChats.includes(shortFormat) ||
                           this.authorizedChats.includes(fullFormat);
        
        console.log(`Authorization check for chat ${chatId}:`, {
            chatIdStr,
            chatIdNum,
            shortFormat,
            fullFormat,
            authorizedChats: this.authorizedChats,
            isAuthorized
        });
        
        return isAuthorized;
    }

    cleanFileName(filename) {
        if (!filename) return '';
        
        const cleanName = filename.replace(/\.[^/.]+$/, '');
        
        const words = cleanName.toLowerCase()
            .split(/[\s\-_\.]+/)
            .filter(word => 
                word.length > 2 && 
                !EXCLUDE_WORDS.includes(word.toLowerCase()) &&
                !/^\d+$/.test(word) 
            );
        
        return words.join(' ');
    }

    async searchFiles(query, page = 1) {
        try {
            const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
            
            if (searchTerms.length === 0) {
                return {
                    success: false,
                    message: 'Please provide a search term with at least 3 characters.'
                };
            }

            const regexPatterns = searchTerms.map(term => new RegExp(term, 'i'));

            const matchingFiles = await File.find({
                $or: regexPatterns.map(pattern => ({
                    file_name: { $regex: pattern }
                }))
            }).sort({ timestamp: -1 });

            if (matchingFiles.length === 0) {
                return {
                    success: false,
                    message: 'No files found matching your search query.'
                };
            }

            const scoredResults = matchingFiles.map(file => {
                const cleanName = this.cleanFileName(file.file_name);
                let score = 0;
                
                searchTerms.forEach(term => {
                    const termRegex = new RegExp(term, 'i');
                    if (termRegex.test(cleanName)) {
                        score += 1;
                    }
                    if (cleanName.toLowerCase().includes(term.toLowerCase())) {
                        score += 0.5;
                    }
                });

                return {
                    ...file.toObject(),
                    score,
                    cleanName
                };
            });

            const sortedResults = scoredResults
                .filter(result => result.score > 0)
                .sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return new Date(b.timestamp) - new Date(a.timestamp);
                });

            const totalResults = sortedResults.length;
            const totalPages = Math.ceil(totalResults / this.resultsPerPage);
            const startIndex = (page - 1) * this.resultsPerPage;
            const endIndex = startIndex + this.resultsPerPage;
            const pageResults = sortedResults.slice(startIndex, endIndex);

            return {
                success: true,
                results: pageResults,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalResults,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };

        } catch (error) {
            console.error('Search error:', error);
            return {
                success: false,
                message: 'Error occurred while searching. Please try again.'
            };
        }
    }

    generateSearchKeyboard(results, pagination, query) {
        const keyboard = [];

        results.forEach((file, index) => {
            const displayName = file.file_name.length > 50 
                ? file.file_name.substring(0, 50) + '...'
                : file.file_name;
            
            const fileTypeIcon = this.getFileTypeIcon(file.file_type);
            const buttonText = `${fileTypeIcon} ${displayName}`;
            
            keyboard.push([
                Markup.button.url(buttonText, `https://pirecykings.netlify.app/${file.unique_id}`)
            ]);
        });

        const paginationRow = [];
        
        if (pagination.hasPrev) {
            paginationRow.push(
                Markup.button.callback('⬅️ Previous', `search_page_${pagination.currentPage - 1}_${Buffer.from(query).toString('base64')}`)
            );
        }
        
        paginationRow.push(
            Markup.button.callback(
                `${pagination.currentPage}/${pagination.totalPages}`, 
                'search_info'
            )
        );
        
        if (pagination.hasNext) {
            paginationRow.push(
                Markup.button.callback('Next ➡️', `search_page_${pagination.currentPage + 1}_${Buffer.from(query).toString('base64')}`)
            );
        }

        if (paginationRow.length > 0) {
            keyboard.push(paginationRow);
        }

        keyboard.push([
            Markup.button.callback('❌ Close', 'close_search')
        ]);

        return Markup.inlineKeyboard(keyboard);
    }

    getFileTypeIcon(fileType) {
        const icons = {
            'document': '📄',
            'photo': '🖼️',
            'video': '🎥',
            'animation': '🎬',
            'sticker': '🏷️'
        };
        return icons[fileType] || '📁';
    }

    formatSearchMessage(results, pagination, query) {
        const header = `🔍 **Search Results for:** "${query}"\n\n`;
        const stats = `📊 **Results:** ${pagination.totalResults} files found\n`;
        const pageInfo = `📄 **Page:** ${pagination.currentPage} of ${pagination.totalPages}\n`;

        const footer = '\n💡 Click on any file button below to access it!';
        
        return header + stats + pageInfo + footer;
    }

    getChatType(ctx) {
        return ctx.chat.type;
    }

    getChatInfo(ctx) {
        const chatType = this.getChatType(ctx);
        const chatId = ctx.chat.id;
        const chatTitle = ctx.chat.title || 'Private Chat';
        const username = ctx.from.username || 'Unknown';
        const firstName = ctx.from.first_name || 'Unknown';
        
        return {
            chatType,
            chatId,
            chatTitle,
            username,
            firstName
        };
    }
}

const setupSearch = (bot, logger) => {
    const searchSystem = new SearchSystem();

    bot.command('search', async (ctx) => {
        try {
            const chatInfo = searchSystem.getChatInfo(ctx);
            
           
            if (!searchSystem.isAuthorizedChat(chatInfo.chatId) && !(chatInfo.chatType==='private')) {
                const unauthorizedMessage = 'CAACAgUAAxkBAAIC4Ghqs_GfZCf7DdJ0mTSo1bNPwLY2AALUBQACjOdJVO4eh8QAAaCe6zYE';
                
                await ctx.replyWithSticker(unauthorizedMessage);
                
                if (logger) {
                    await logger.command(
                        ctx.from.id,
                        `${chatInfo.firstName} (${chatInfo.username})`,
                        'Search command used',
                        'UNAUTHORIZED',
                        `Unauthorized chat: ${chatInfo.chatId} (${chatInfo.chatTitle})`
                    );
                }
                return;
            }

            const args = ctx.message.text.split(' ').slice(1);
            
            if (args.length === 0) {
                await ctx.reply('Use format:\n<code>/search Kalki 2898 AD</code>\n\n<i>Name must be at least 3 characters long</i>',
                    { parse_mode: 'HTML' }
                );
                return;
            }

            const query = args.join(' ').trim();
            
            if (query.length < 3) {
                await ctx.reply('❌ Search query must be at least 3 characters long.');
                return;
            }

            const searchingMsg = await ctx.reply('🔍 Searching files...');

            const searchResults = await searchSystem.searchFiles(query, 1);

            await ctx.telegram.deleteMessage(ctx.chat.id, searchingMsg.message_id);

            if (!searchResults.success) {
                await ctx.reply(`❌ ${searchResults.message}`);
                return;
            }

            const message = searchSystem.formatSearchMessage(
                searchResults.results, 
                searchResults.pagination, 
                query
            );
            
            const keyboard = searchSystem.generateSearchKeyboard(
                searchResults.results, 
                searchResults.pagination, 
                query
            );

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });

            if (logger) {
                await logger.command(
                    ctx.from.id,
                    `${chatInfo.firstName} (${chatInfo.username})`,
                    'Search command used',
                    'SUCCESS',
                    `Search query: "${query}", Results: ${searchResults.pagination.totalResults}, Chat: ${chatInfo.chatId} (${chatInfo.chatTitle})`
                );
            }

        } catch (error) {
            console.error('Search command error:', error);
            if (logger) {
                const chatInfo = searchSystem.getChatInfo(ctx);
                await logger.error(
                    ctx.from.id,
                    `${chatInfo.firstName} (${chatInfo.username})`,
                    'Search command used',
                    'FAILED',
                    error.message
                );
            }
            await ctx.reply('❌ Error occurred while searching. Please try again.');
        }
    });

    bot.action(/^search_page_(\d+)_(.+)$/, async (ctx) => {
        try {
            const chatInfo = searchSystem.getChatInfo(ctx);
            
            // Check if chat is authorized for pagination actions too
            if (!searchSystem.isAuthorizedChat(chatInfo.chatId)) {
                await ctx.answerCbQuery('🚫 Unauthorized chat');
                return;
            }

            const page = parseInt(ctx.match[1]);
            const encodedQuery = ctx.match[2];
            const query = Buffer.from(encodedQuery, 'base64').toString();

            const searchResults = await searchSystem.searchFiles(query, page);

            if (!searchResults.success) {
                await ctx.answerCbQuery('❌ Error loading page');
                return;
            }

            const message = searchSystem.formatSearchMessage(
                searchResults.results, 
                searchResults.pagination, 
                query
            );
            
            const keyboard = searchSystem.generateSearchKeyboard(
                searchResults.results, 
                searchResults.pagination, 
                query
            );

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });

            await ctx.answerCbQuery(`📄 Page ${page} loaded`);

        } catch (error) {
            console.error('Pagination error:', error);
            await ctx.answerCbQuery('❌ Error loading page');
        }
    });

    bot.action('search_info', async (ctx) => {
        const chatInfo = searchSystem.getChatInfo(ctx);
        
        if (!searchSystem.isAuthorizedChat(chatInfo.chatId)) {
            await ctx.answerCbQuery('🚫 Unauthorized chat');
            return;
        }
        
        await ctx.answerCbQuery('📊 Search results pagination info');
    });

    bot.action('close_search', async (ctx) => {
        try {
            const chatInfo = searchSystem.getChatInfo(ctx);
            
            if (!searchSystem.isAuthorizedChat(chatInfo.chatId)) {
                await ctx.answerCbQuery('🚫 Unauthorized chat');
                return;
            }

            await ctx.deleteMessage();
            await ctx.answerCbQuery('🗑️ Search results closed');
        } catch (error) {
            console.error('Close search error:', error);
            await ctx.answerCbQuery('❌ Error closing search');
        }
    });

    // Command to check authorized chats (for debugging)
    bot.command('checkauth', async (ctx) => {
        try {
            const chatInfo = searchSystem.getChatInfo(ctx);
            const isAuthorized = searchSystem.isAuthorizedChat(chatInfo.chatId);
            
            const message = `🔍 **Authorization Check**\n\n` +
                          `**Chat ID:** ${chatInfo.chatId}\n` +
                          `**Chat Type:** ${chatInfo.chatType}\n` +
                          `**Chat Title:** ${chatInfo.chatTitle}\n` +
                          `**Authorization Status:** ${isAuthorized ? '✅ Authorized' : '❌ Not Authorized'}\n\n` +
                          `**Total Authorized Chats:** ${searchSystem.authorizedChats.length}`;
            
            await ctx.reply(message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            console.error('Check auth error:', error);
            await ctx.reply('❌ Error checking authorization status.');
        }
    });
};

module.exports = setupSearch;