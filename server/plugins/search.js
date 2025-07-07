const { Markup } = require('telegraf');
const File = require('../models/File');

const EXCLUDE_WORDS = ['[PK]', '[PirecyKings]', '[A14]'
];

const AUTHORIZED_GROUPS = [-1002102890038,-1002311062019,-1002161034243,-1001798513974,-1001691578341]

class SearchSystem {
    constructor() {
        this.resultsPerPage = 10;
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
            const searchQuery = query.toLowerCase().trim();

            if (searchQuery.length < 3) {
                return {
                    success: false,
                    message: 'Please provide a search term with at least 3 characters.'
                };
            }

            const exactPhraseRegex = new RegExp(this.escapeRegex(searchQuery), 'i');

            const matchingFiles = await File.find({
                file_name: { $regex: exactPhraseRegex }
            }).sort({ timestamp: -1 });

            if (matchingFiles.length === 0) {
                return {
                    success: false,
                    message: 'No files found matching your search query.'
                };
            }

            const scoredResults = matchingFiles.map(file => {
                const cleanName = this.cleanFileName(file.file_name);
                const originalName = file.file_name.toLowerCase();
                let score = 0;

                if (originalName.includes(searchQuery)) {
                    score += 10;
                }

                if (cleanName.includes(searchQuery)) {
                    score += 8;
                }

                const queryWords = searchQuery.split(/\s+/);
                let wordMatches = 0;
                queryWords.forEach(word => {
                    if (originalName.includes(word)) {
                        wordMatches++;
                    }
                });

                if (wordMatches === queryWords.length) {
                    score += 5;
                }

                score += wordMatches;

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

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
}

const setupSearch = (bot, logger) => {
    const searchSystem = new SearchSystem();


    bot.command('chatid', (ctx) => {
        ctx.reply(`Chat ID: ${ctx.chat.id}`);
    });

    bot.command('search', async (ctx) => {
        try {
            const chatType = ctx.chat.type;
            const chatId = ctx.chat.id;

            if (chatType !== 'private' && !AUTHORIZED_GROUPS.includes(chatId)) {
                await ctx.reply('❌ Search command is not authorized in this group.');
                return;
            }

            const args = ctx.message.text.split(' ').slice(1);

            if (args.length === 0) {
                await ctx.reply('Search format:\n<i>/search file_name</i>\n\nExample:\n<code>/search Kalki 2898AD</code>\n\n<i>Use complete phrases for exact matches</i>',
                    { parse_mode: 'HTML' }
                );
                return;
            }

            const query = args.join(' ').trim();

            if (query.length < 3) {
                await ctx.reply('❌ Search query must be at least 3 characters long.');
                return;
            }

            const searchingMsg = await ctx.reply('🔍 Searching for exact phrase...');

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
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                    'Search command used',
                    'SUCCESS',
                    `Search query: "${query}", Results: ${searchResults.pagination.totalResults}`
                );
            }

        } catch (error) {
            console.error('Search command error:', error);
            if (logger) {
                await logger.error(
                    ctx.from.id,
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
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
            const chatType = ctx.chat.type;
            const chatId = ctx.chat.id;

            if (chatType !== 'private' && !AUTHORIZED_GROUPS.includes(chatId)) {
                await ctx.answerCbQuery('❌ Not authorized in this group');
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
        await ctx.answerCbQuery('📊 Search results pagination info');
    });

    bot.action('close_search', async (ctx) => {
        try {
            const chatType = ctx.chat.type;
            const chatId = ctx.chat.id;

            if (chatType !== 'private' && !AUTHORIZED_GROUPS.includes(chatId)) {
                await ctx.answerCbQuery('❌ Not authorized in this group');
                return;
            }

            await ctx.deleteMessage();
            await ctx.answerCbQuery('🗑️ Search results closed');
        } catch (error) {
            console.error('Close search error:', error);
            await ctx.answerCbQuery('❌ Error closing search');
        }
    });
};

module.exports = setupSearch;