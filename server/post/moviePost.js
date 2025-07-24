const axios = require('axios');
const { Markup } = require('telegraf');
const Post = require('../models/Post');
const { TMDB_API_KEY, TMDB_BASE_URL, WATERMARK_CHANNEL } = require('../config')
const MoviePost = require('../models/Movie');

const setupPostCommand = (bot, logger, ADMIN_IDS) => {
    const isAdmin = async (ctx, next) => {
        if (!ADMIN_IDS.includes(ctx.from.id)) {
            return ctx.reply('❌ 𝙊𝙣𝙡𝙮 𝙖𝙙𝙢𝙞𝙣𝙨 𝙘𝙖𝙣 𝙪𝙨𝙚 𝙩𝙝𝙞𝙨 𝙘𝙤𝙢𝙢𝙖𝙣𝙙');
        }
        return next();
    };

    const searchMovies = async (movieName, page = 1) => {
        try {
            const searchResponse = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
                params: {
                    api_key: TMDB_API_KEY,
                    query: movieName,
                    include_adult: false,
                    language: 'en-US',
                    page: page
                }
            });

            return searchResponse.data;
        } catch (error) {
            console.error('Error searching movies:', error);
            return null;
        }
    };

    const getMovieDetails = async (movieId) => {
        try {
            const movieResponse = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
                params: {
                    api_key: TMDB_API_KEY,
                    language: 'en-US'
                }
            });

            return movieResponse.data;
        } catch (error) {
            console.error('Error fetching movie details:', error);
            return null;
        }
    };

    const formatGenres = (genres) => {
        return genres.map(genre => genre.name).join(', ');
    };

    const createMoviePost = (movieData, downloadLinks, postId = null) => {
        const releaseYear = movieData.release_date ?
            new Date(movieData.release_date).getFullYear() : 'N/A';

        const genres = formatGenres(movieData.genres);
        const synopsis = movieData.overview || 'No synopsis available';
        const runtime = movieData.runtime || "NA";

        function formatRuntime(minutes) {
            if (!minutes || isNaN(minutes)) return "NA";

            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;

            return hours > 0
                ? `${hours} hr ${remainingMinutes} min`
                : `${remainingMinutes} min`;
        }
        const formattedRuntime = formatRuntime(runtime);

        const caption = `<b>${movieData.title} (${releaseYear})

» 𝗔𝘂𝗱𝗶𝗼: Hindi+English (E-subs)
» 𝗤𝘂𝗮𝗹𝗶𝘁𝘆: 480p | 720p | 1080p 
» 𝗚𝗲𝗻𝗿𝗲: ${genres}
» 𝗥𝘂𝗻𝘁𝗶𝗺𝗲: ${formattedRuntime}

» 𝗦𝘆𝗻𝗼𝗽𝘀𝗶𝘀:</b>
<blockquote>${synopsis}</blockquote>
            
<b>@${WATERMARK_CHANNEL}</b>
<blockquote>[𝗜𝗳 𝗬𝗼𝘂 𝗦𝗵𝗮𝗿𝗲 𝗢𝘂𝗿 𝗙𝗶𝗹𝗲𝘀 𝗪𝗶𝘁𝗵𝗼𝘂𝘁 𝗖𝗿𝗲𝗱𝗶𝘁, 𝗧𝗵𝗲𝗻 𝗬𝗼𝘂 𝗪𝗶𝗹𝗹 𝗯𝗲 𝗕𝗮𝗻𝗻𝗲𝗱]</blockquote>`;

        const buttons = downloadLinks.map((downloadLink, index) => {
            const [buttonText, link] = downloadLink.trim().split('=').map(item => item.trim());

            if (!link || link === '' || link === 'placeholder') {
                return Markup.button.callback(
                    buttonText,
                    postId ? `maddlink_${postId}_${index}` : `temp_${index}`
                );
            }

            return Markup.button.url(buttonText, link);
        });

        const buttonRows = [];
        for (let i = 0; i < buttons.length; i += 2) {
            const row = buttons.slice(i, i + 2);
            buttonRows.push(row);
        }

        const inlineKeyboard = Markup.inlineKeyboard(buttonRows);

        return {
            caption,
            keyboard: inlineKeyboard
        };
    };

    const getMoviePosterUrl = (movieData) => {
        if (movieData.poster_path) {
            return `https://image.tmdb.org/t/p/w500${movieData.poster_path}`;
        }
        return null;
    };

    const createPaginationKeyboard = (queryId, currentPage, totalPages) => {
        const buttons = [];

        if (currentPage > 1) {
            buttons.push(Markup.button.callback('◀️ Previous', `page_${queryId}_${currentPage - 1}`));
        }

        buttons.push(Markup.button.callback(`${currentPage}/${totalPages}`, 'noop'));

        if (currentPage < totalPages) {
            buttons.push(Markup.button.callback('Next ▶️', `page_${queryId}_${currentPage + 1}`));
        }

        return buttons;
    };

    bot.command(['setsticker', 'ss'], isAdmin, async (ctx) => {
        try {
            setTimeout(async () => {
                await ctx.deleteMessage()
            }, 5000)

            const repliedMessage = ctx.message.reply_to_message;

            if (!repliedMessage || !repliedMessage.sticker) {
                return ctx.reply('❌ Please forward or reply to a sticker with this command');
            }

            const stickerId = repliedMessage.sticker.file_id;
            const postSetting = await Post.getLatestForAdmin(ctx.from.id);

            if (!postSetting) {
                return ctx.reply('❌ No channel set. Please use /setchannel command first.');
            }

            await Post.findOneAndUpdate(
                { adminId: ctx.from.id },
                {
                    stickerId,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );

            await logger.command(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Set sticker command used',
                'SUCCESS',
                `Sticker set: ${stickerId}`
            );

            return ctx.reply(`✅ Sticker has been set for your channel posts.`);

        } catch (error) {
            console.error('Error setting sticker:', error);
            await logger.error(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Set sticker command used',
                'FAILED',
                error.message
            );
            return ctx.reply('Error setting sticker. Please try again.');
        }
    });

    bot.command(['setchannel', 'sc'], isAdmin, async (ctx) => {
        try {
            setTimeout(async () => {
                await ctx.deleteMessage()
            }, 5000)

            const args = ctx.message.text.split(' ').slice(1);

            if (args.length < 1) {
                return ctx.reply('Please provide a channel ID or username in the format: \n/setchannel @channelUsername\nor\n/setchannel -100xxxxxxxxxx');
            }

            let channelId = args[0];
            let channelUsername = null;

            if (channelId.startsWith('@')) {
                channelUsername = channelId.substring(1);
                try {
                    const chat = await ctx.telegram.getChat(channelId);
                    channelId = chat.id.toString();
                } catch (error) {
                    return ctx.reply(`❌ Couldn't find the channel ${channelId}. Make sure the bot is added to the channel as an admin.`);
                }
            }

            try {
                const botMember = await ctx.telegram.getChatMember(channelId, ctx.botInfo.id);
                const requiredPermissions = ['can_post_messages'];

                const missingPermissions = requiredPermissions.filter(perm => !botMember[perm]);

                if (missingPermissions.length > 0) {
                    return ctx.reply(`❌ Bot lacks the necessary permissions in this channel. Please make the bot an admin with posting privileges.`);
                }
            } catch (error) {
                return ctx.reply('❌ Cannot verify bot permissions in this channel. Make sure the bot is an admin in the channel.');
            }

            await Post.findOneAndUpdate(
                { adminId: ctx.from.id },
                {
                    channelId,
                    channelUsername,
                    adminId: ctx.from.id,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );

            await logger.command(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Set channel command used',
                'SUCCESS',
                `Channel set to ${channelUsername ? '@' + channelUsername : channelId}`
            );

            return ctx.reply(`✅ Channel ${channelUsername ? '@' + channelUsername : channelId} has been set as your default posting channel.`);

        } catch (error) {
            console.error('Error setting channel:', error);
            await logger.error(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Set channel command used',
                'FAILED',
                error.message
            );
            return ctx.reply('Error setting channel. Please try again.');
        }
    });

    bot.context.postedMovieMessages = bot.context.postedMovieMessages || {};

    bot.command(['post'], isAdmin, async (ctx) => {
        try {
            setTimeout(async () => {
                await ctx.deleteMessage()
            }, 5000);

            const commandText = ctx.message.text.replace(/^\/post\s+/i, '');
            const parts = commandText.split('|').map(p => p.trim());
            const movieName = parts.shift();

            if (!movieName || parts.length === 0) {
                await logger.command(
                    ctx.from.id,
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                    'Post command used',
                    'FAILED',
                    'Invalid format'
                );
                return ctx.reply('Please use the format: /post Movie_Name | Button 1 = link1 | Button 2 = link2 | ...\n\n*Note: You can use "placeholder" as link value to add links later dynamically*');
            }
            const downloadLinks = parts;

            if (downloadLinks.length === 0) {
                await logger.command(
                    ctx.from.id,
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                    'Movie Post command used',
                    'FAILED',
                    'No link provided'
                );
                return ctx.reply('Please provide at least one button link in the format: Button X = link\n*You can use "placeholder" as link value to add links later*');
            }

            for (const downloadLink of downloadLinks) {
                if (!downloadLink.includes('=')) {
                    return ctx.reply(`Invalid format for '${downloadLink}'. Please use 'Button X = link' format.`);
                }
            }

            const postSetting = await Post.getLatestForAdmin(ctx.from.id);

            if (!postSetting) {
                await logger.command(
                    ctx.from.id,
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                    'Movie Post command used',
                    'FAILED',
                    'No channel set'
                );
                return ctx.reply('❌ No channel set. Please use /setchannel command first.');
            }

            const processingMsg = await ctx.reply('⌛ Searching for movies...');
            const searchResults = await searchMovies(movieName);

            if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
                await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
                await logger.command(
                    ctx.from.id,
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                    'Post command used',
                    'FAILED',
                    `No movies found for: ${movieName}`
                );
                return ctx.reply(`❌ No movies found for: "${movieName}"`);
            }

            bot.context.searchCache = bot.context.searchCache || {};
            const queryId = `q${ctx.from.id}_${Date.now()}`;

            bot.context.searchCache[queryId] = {
                query: movieName,
                downloadLinks,
                currentPage: 1,
                totalPages: searchResults.total_pages,
                results: searchResults
            };

            const movieButtons = searchResults.results.map(movie => {
                const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
                return [Markup.button.callback(
                    `${movie.title} (${year})`,
                    `movie_${movie.id}_${queryId}`
                )];
            });

            if (searchResults.total_pages > 1) {
                movieButtons.push(
                    createPaginationKeyboard(queryId, 1, searchResults.total_pages)
                );
            }

            await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);

            await ctx.reply(
                `🎬 Found ${searchResults.total_results} results for "${movieName}"\n\nPlease select a movie:`,
                Markup.inlineKeyboard(movieButtons)
            );

            await logger.command(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Post command used',
                'SUCCESS',
                `Searched for movie: ${movieName}, found ${searchResults.total_results} results`
            );

        } catch (error) {
            console.error('Error in post command:', error);
            await logger.error(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Post command used',
                'FAILED',
                error.message
            );
            await ctx.reply('Error searching for movies. Please try again.');
        }
    });

    bot.command(['maddlink', 'mal'], isAdmin, async (ctx) => {
        try {
            setTimeout(async () => {
                await cyx.deleteMessage()
            }, 5000);

            const commandText = ctx.message.text.substring(9).trim(); // Remove /addlink and trim

            if (!commandText.includes('|')) {
                return ctx.reply('Please use the format: /maddlink post_id | Button 1 = newlink1 | Button 2 = newlink2');
            }

            const parts = commandText.split('|').map(part => part.trim());
            const postId = parts[0];
            const newLinks = parts.slice(1);

            const moviePost = await MoviePost.findByPostId(postId);

            if (!moviePost) {
                return ctx.reply('❌ Post not found. Please check the post Id.');
            }
            if (moviePost.adminId !== ctx.from.id) {
                return ctx.reply('❌ You can only edit posts that you created.');
            }

            const linkUpdates = {};
            for (const linkData of newLinks) {
                if (!linkData.includes('=')) {
                    return ctx.reply(`Invalid format for '${linkData}'. Please use 'Button X = link' format.`);
                }

                const [downloadText, newLink] = linkData.split('=').map(item => item.trim());

                const downloadIndex = moviePost.downloadLinks.findIndex(originalLink => {
                    const [originalButtonText] = originalLink.split('=').map(item => item.trim());
                    return originalButtonText.toLowerCase() === downloadText.toLowerCase();
                });

                if (downloadIndex === -1) {
                    return ctx.reply(`❌ Button "${downloadText}" not found in original post.`)
                }

                linkUpdates[downloadIndex] = newLink;
            }

            const updatedDownloadLinks = [...moviePost.downloadLinks];
            for (const [index, newLink] of Object.entries(linkUpdates)) {
                const [downloadText] = updatedDownloadLinks[index].split('=').map(item => item.trim());
                updatedDownloadLinks[index] = `${downloadText} = ${newLink}`;
            }

            const updatedPost = createMoviePost(moviePost.movieData, updatedDownloadLinks, postId);

            try {
                if (moviePost.posterUrl) {
                    await ctx.telegram.editMessageCaption(
                        moviePost.channelId,
                        moviePost.messageId,
                        undefined,
                        updatedPost.caption,
                        {
                            parse_mode: 'HTML',
                            ...updatedPost.keyboard
                        }
                    );
                } else {
                    await ctx.telegram.editMessageText(
                        moviePost.channelId,
                        moviePost.messageId,
                        undefined,
                        updatedPost.caption,
                        {
                            parse_mode: 'HTML',
                            ...updatedPost.keyboard
                        }
                    );
                }

                // Update database
                await MoviePost.updateDownloadLinks(postId, updatedDownloadLinks);

                await ctx.reply('✅ Links updated successfully in the channel post!');

                await logger.command(
                    ctx.from.id,
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                    'Add link to Movie post',
                    'SUCCESS',
                    `Updated links for post ID: ${postId}`
                );

            } catch (editError) {
                console.error('Error editing message:', editError);
                await ctx.reply('❌ Error updating the post. The message might be too old or the bot might not have edit permissions.');

                await logger.error(
                    ctx.from.id,
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                    'Add link to Movie post',
                    'FAILED',
                    `Edit error for post ID ${postId}: ${editError.message}`
                );
            }

        } catch (error) {
            console.error('Error in addlink command:', error);
            await ctx.reply('❌ An error occurred while updating links. Please try again.');

            await logger.error(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Add link command',
                'FAILED',
                error.message
            );
        }

    });

    bot.command(['mlistposts', 'mlpost'], isAdmin, async (ctx) => {
        try {
            setTimeout(async () => {
                await ctx.deleteMessage()
            }, 5000);

            // Get posts from database
            const userPosts = await MoviePost.findByAdminId(ctx.from.id, 10);

            if (userPosts.length === 0) {
                return ctx.reply('❌ No posts found for your account.');
            }

            let message = '📋 **Your Recent Movie Posts:**\n\n';

            userPosts.forEach((post) => {
                const date = post.createdAt.toLocaleDateString();
                message += `🆔 \`${post.postId}\`\n`;
                message += `📺 **${post.movieName}**\n`;
                message += `📅 ${date}\n`;
                message += `📍 Channel: ${post.channelId}\n\n`;
            });

            message += '\n💡 Use `/maddlink POST_ID | Button X = newlink` to update links';

            await ctx.reply(message, { parse_mode: 'Markdown' });

            await logger.command(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'List posts command',
                'SUCCESS',
                `Listed ${userPosts.length} posts`
            );

        } catch (error) {
            console.error('Error in listposts command:', error);
            await ctx.reply('❌ An error occurred while fetching posts.');

            await logger.error(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'List posts command',
                'FAILED',
                error.message
            );
        }
    });

    bot.command(['mupdatebtn', 'mubtn'], isAdmin, async (ctx) => {
        try {
            setTimeout(async () => {
                await ctx.deleteMessage()
            }, 5000);

            const commandText = ctx.message.text.substring(11).trim();

            if (!commandText) {
                return ctx.reply('Please use the format: /mupdatebtn postId');
            }

            const postId = commandText;

            // Get post from database
            const moviePost = await MoviePost.findByPostId(postId);
            console.log(moviePost);
            if (!moviePost) {
                return ctx.reply('❌ Post not found. Please check the post ID.');

            }

            if (moviePost.adminId !== ctx.from.id) {
                return ctx.reply('❌ You can only edit posts that you created.');
            }

            const post = createMoviePost(moviePost.movieData, moviePost.downloadLinks, postId);
            const buttons = [];

            moviePost.downloadLinks.forEach((downloadLink, index) => {
                const [buttonText] = downloadLink.trim().split('=').map(item => item.trim());
                buttons.push([Markup.button.callback(`📝 ${buttonText}`, `meditbtn_${postId}_${index}`)]);
            });

            buttons.push([Markup.button.callback('➕ Add New Button', `maddbtn_${postId}`)]);
            buttons.push([Markup.button.callback('🔙 Go Back', `mgoback_${postId}`)]);

            await ctx.reply(
                `🔧 **Update Buttons for "${moviePost.movieName}"**\n\nSelect a button to edit or add a new one:`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard(buttons)
                }
            );

        } catch (error) {
            console.error('Error in updatebtn command:', error);
            await ctx.reply('❌ An error occurred while loading button editor.');

            await logger.error(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Update button command',
                'FAILED',
                error.message
            );
        }
    });

    bot.action(/^meditbtn_(.+)_(\d+)$/, async (ctx) => {
    try {
        const postId = ctx.match[1];
        const buttonIndex = parseInt(ctx.match[2]);

        const moviePost = await MoviePost.findByPostId(postId);
        if (!moviePost) {
            return ctx.answerCbQuery('❌ Post not found');
        }

        const [currentButtonText, currentLink] = moviePost.downloadLinks[buttonIndex].split('=').map(item => item.trim());

        const contextId = `meditbtn_${postId}_${buttonIndex}_${Date.now()}`;
        bot.context.movieButtonEditContext = bot.context.movieButtonEditContext || {};
        bot.context.movieButtonEditContext[contextId] = {
            postId,
            buttonIndex,
            currentText: currentButtonText,
            currentLink,
            adminId: ctx.from.id,
            step: 'name'
        };

        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `✏️ **Edit Button: ${currentButtonText}**\n\nCurrent Link: ${currentLink}\n\nPlease send the new button name:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Go Back', `mgobackedit_${contextId}`)]])
            }
        );

    } catch (error) {
        console.error('Error in edit button action:', error);
        await ctx.answerCbQuery('❌ Error editing button');
    }
});

    bot.action(/^maddbtn_(.+)$/, async (ctx) => {
    try {
        const postId = ctx.match[1];
        const moviePost = await MoviePost.findByPostId(postId);
        if (!moviePost) {
            return ctx.answerCbQuery('❌ Post not found');
        }

        const contextId = `maddbtn_${postId}_${Date.now()}`;
        bot.context.movieButtonEditContext = bot.context.movieButtonEditContext || {};
        bot.context.movieButtonEditContext[contextId] = {
            postId,
            adminId: ctx.from.id,
            step: 'name',
            isNewButton: true
        };

        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `➕ **Add New Button**\n\nPlease send the button name:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Go Back', `mgobackedit_${contextId}`)]])
            }
        );

    } catch (error) {
        console.error('Error in add button action:', error);
        await ctx.answerCbQuery('❌ Error adding button');
    }
});

bot.action(/^mgoback_(.+)$/, async (ctx) => {
    try {
        const postId = ctx.match[1];
        const moviePost = await MoviePost.findByPostId(postId);
        
        if (!moviePost) {
            await ctx.answerCbQuery('❌ Post not found');
            return ctx.editMessageText('❌ Post not found.');
        }

        await ctx.answerCbQuery('Going back to main menu');
        await ctx.editMessageText(
            `🔧 **Post Management Menu**\n\n📋 Post: "${moviePost.movieName}"\n🆔 ID: \`${postId}\`\n\nChoose an action:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('📝 Update Buttons', `mupdatebtns_${postId}`)],
                    [Markup.button.callback('❌ Close', `mclose_${postId}`)]
                ])
            }
        );
    } catch (error) {
        console.error('Error in go back action:', error);
        await ctx.answerCbQuery('❌ Error going back');
    }
});

bot.action(/^mgobackedit_(.+)$/, async (ctx) => {
    try {
        const contextId = ctx.match[1];
        const contextData = bot.context.movieButtonEditContext?.[contextId];

        if (contextData) {
            const postId = contextData.postId;
            delete bot.context.movieButtonEditContext[contextId];

            const moviePost = await MoviePost.findByPostId(postId);
            if (!moviePost) {
                await ctx.answerCbQuery('❌ Post not found');
                return ctx.editMessageText('❌ Post not found.');
            }

            const buttons = [];
            moviePost.downloadLinks.forEach((downloadLink, index) => {
                const [buttonText] = downloadLink.trim().split('=').map(item => item.trim());
                buttons.push([Markup.button.callback(`📝 ${buttonText}`, `meditbtn_${postId}_${index}`)]);
            });

            buttons.push([Markup.button.callback('➕ Add New Button', `maddbtn_${postId}`)]);
            buttons.push([Markup.button.callback('🔙 Go Back', `mgoback_${postId}`)]);

            await ctx.answerCbQuery('Returning to button menu');
            await ctx.editMessageText(
                `🔧 **Update Buttons for "${moviePost.movieName}"**\n\nSelect a button to edit or add a new one:`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard(buttons)
                }
            );
        } else {
            await ctx.answerCbQuery('Session expired');
            await ctx.editMessageText('❌ Session expired. Please try again.');
        }
    } catch (error) {
        console.error('Error in go back edit action:', error);
        await ctx.answerCbQuery('❌ Error going back');
    }
});

bot.action(/^mupdatebtns_(.+)$/, async (ctx) => {
    try {
        const postId = ctx.match[1];
        const moviePost = await MoviePost.findByPostId(postId);
        
        if (!moviePost) {
            return ctx.answerCbQuery('❌ Post not found');
        }

        const buttons = [];
        moviePost.downloadLinks.forEach((downloadLink, index) => {
            const [buttonText] = downloadLink.trim().split('=').map(item => item.trim());
            buttons.push([Markup.button.callback(`📝 ${buttonText}`, `meditbtn_${postId}_${index}`)]);
        });

        buttons.push([Markup.button.callback('➕ Add New Button', `maddbtn_${postId}`)]);
        buttons.push([Markup.button.callback('🔙 Go Back', `mgoback_${postId}`)]);

        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `🔧 **Update Buttons for "${moviePost.movieName}"**\n\nSelect a button to edit or add a new one:`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons)
            }
        );
    } catch (error) {
        console.error('Error in update buttons action:', error);
        await ctx.answerCbQuery('❌ Error loading buttons');
    }
});

bot.action(/^mclose_(.+)$/, async (ctx) => {
    try {
        await ctx.answerCbQuery('Menu closed');
        await ctx.editMessageText('✅ Menu closed.');
    } catch (error) {
        console.error('Error closing menu:', error);
    }
});

    bot.action(/^mcancelbtn_(.+)$/, async (ctx) => {
        try {
            await ctx.answerCbQuery('Operation cancelled');
            await ctx.editMessageText('❌ Button update cancelled.');
        } catch (error) {
            console.error('Error cancelling button update:', error);
        }
    });

    bot.action(/^mcanceledit_(.+)$/, async (ctx) => {
        try {
            const contextId = ctx.match[1];

            if (bot.context.movieButtonEditContext && bot.context.movieButtonEditContext[contextId]) {
                delete bot.context.movieButtonEditContext[contextId];
            }

            await ctx.answerCbQuery('Edit cancelled');
            await ctx.editMessageText('❌ Button edit cancelled.');
        } catch (error) {
            console.error('Error cancelling button edit:', error);
        }
    });

    bot.action(/^page_(.+)_(\d+)$/, async (ctx) => {
        try {
            const queryId = ctx.match[1];
            const page = parseInt(ctx.match[2]);

            if (!bot.context.searchCache || !bot.context.searchCache[queryId]) {
                return ctx.answerCbQuery('Session expired. Please search again.');
            }

            const cachedSearch = bot.context.searchCache[queryId];
            const searchResults = await searchMovies(cachedSearch.query, page);

            if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
                await ctx.answerCbQuery('No results found on this page');
                return;
            }

            cachedSearch.currentPage = page;
            cachedSearch.results = searchResults;

            const movieButtons = searchResults.results.map(movie => {
                const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
                return [Markup.button.callback(
                    `${movie.title} (${year})`,
                    `movie_${movie.id}_${queryId}`
                )];
            });

            movieButtons.push(
                createPaginationKeyboard(queryId, page, searchResults.total_pages)
            );

            await ctx.editMessageText(
                `🎬 Found ${searchResults.total_results} results for "${cachedSearch.query}" (Page ${page}/${searchResults.total_pages})\n\nPlease select a movie:`,
                Markup.inlineKeyboard(movieButtons)
            );

            await ctx.answerCbQuery();
        } catch (error) {
            console.error('Error handling pagination:', error);
            await ctx.answerCbQuery('Error loading page');
        }
    });

    bot.action('noop', async (ctx) => {
        await ctx.answerCbQuery();
    });

    bot.action(/^movie_(\d+)_(.+)$/, async (ctx) => {
        try {
            const movieId = ctx.match[1];
            const queryId = ctx.match[2];

            if (!bot.context.searchCache || !bot.context.searchCache[queryId]) {
                return ctx.answerCbQuery('Session expired. Please search again.');
            }

            const cachedSearch = bot.context.searchCache[queryId];
            const downloadLinks = cachedSearch.downloadLinks;

            await ctx.answerCbQuery('Loading movie details...');
            await ctx.editMessageText('⌛ Fetching movie details...');

            const movieData = await getMovieDetails(movieId);

            if (!movieData) {
                return ctx.editMessageText('❌ Error fetching movie details. Please try again.');
            }

            const postId = `p${ctx.from.id}_${Date.now()}`;
            const post = createMoviePost(movieData, downloadLinks, postId);
            const posterUrl = getMoviePosterUrl(movieData);
            const postSetting = await Post.getLatestForAdmin(ctx.from.id);

            const channelInfo = postSetting.channelUsername ?
                `@${postSetting.channelUsername}` :
                postSetting.channelId;

            const confirmationButtons = Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Post to Channel', `mconfirm_${postId}`),
                    Markup.button.callback('❌ Cancel', `mcancel_${postId}`)
                ]
            ]);

            bot.context.postData = bot.context.postData || {};
            bot.context.postData[postId] = {
                movieData,
                downloadLinks,
                posterUrl,
                post,
                channelId: postSetting.channelId,
                channelInfo,
                postId
            };

            if (posterUrl) {
                await ctx.telegram.sendPhoto(ctx.chat.id, posterUrl, {
                    caption: `<b>Preview:</b>\n\n${post.caption}\n\n<i>Ready to post to ${channelInfo}</i>`,
                    parse_mode: 'HTML',
                    ...post.keyboard
                });
            } else {
                await ctx.telegram.sendMessage(ctx.chat.id, `<b>Preview:</b>\n\n${post.caption}\n\n<i>Ready to post to ${channelInfo}</i>`, {
                    parse_mode: 'HTML',
                    ...post.keyboard
                });
            }

            await ctx.telegram.sendMessage(ctx.chat.id, 'Would you like to post this to channel?', confirmationButtons);

            if (bot.context.searchCache && bot.context.searchCache[queryId]) {
                delete bot.context.searchCache[queryId];
            }

            await logger.command(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Movie selected',
                'SUCCESS',
                `Created post preview for movie: ${movieData.title}`
            );

        } catch (error) {
            console.error('Error selecting movie:', error);
            await ctx.answerCbQuery('Error loading movie');
            await ctx.editMessageText('Error creating movie post. Please try again.');

            await logger.error(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Movie selection',
                'FAILED',
                error.message
            );
        }
    });

    bot.action(/^mconfirm_(.+)$/, async (ctx) => {
        try {
            setTimeout(async () => {
                await ctx.deleteMessage()
            }, 10000)

            const postId = ctx.match[1];

            if (!bot.context.postData || !bot.context.postData[postId]) {
                await ctx.answerCbQuery('❌ Post data not found');
                return ctx.editMessageText('Unable to find post data. Please create a new post.');
            }

            const postData = bot.context.postData[postId];
            const postSetting = await Post.getLatestForAdmin(ctx.from.id);

            let sentMessage;
            if (postData.posterUrl) {
                sentMessage = await ctx.telegram.sendPhoto(postData.channelId, postData.posterUrl, {
                    caption: postData.post.caption,
                    parse_mode: 'HTML',
                    ...postData.post.keyboard
                });
            } else {
                sentMessage = await ctx.telegram.sendMessage(postData.channelId, postData.post.caption, {
                    parse_mode: 'HTML',
                    ...postData.post.keyboard
                });
            }

            if (postSetting && postSetting.stickerId) {
                try {
                    await ctx.telegram.sendSticker(postData.channelId, postSetting.stickerId);
                } catch (stickerError) {
                    console.error('Error sending sticker:', stickerError);
                }
            }

            try {

                await MoviePost.createMoviePost({
                    postId,
                    adminId: ctx.from.id,
                    movieName: postData.movieData.title,
                    movieId: postData.movieData.id,
                    channelId: postData.channelId,
                    channelUsername: postSetting.channelUsername || null,
                    messageId: sentMessage.message_id,
                    downloadLinks: postData.downloadLinks,
                    movieData: postData.movieData,
                    posterUrl: postData.posterUrl
                })

            } catch (dbError) {
                console.error('Error saving movie post to database:', dbError);
            }

            const postConfimationMsg = '✅ Post sent to channel!'
            await ctx.answerCbQuery(postConfimationMsg);
            const detailedMsg = `✅ Post for "${postData.movieData.title}" has been sent to ${postData.channelInfo} successfully!\n\n🔗 Use \`/maddlink ${postId}\` to add links to buttons.\n🔗 Use \`/mupdatebtn ${postId}\` to add-update-change links-name of buttons.`
            await ctx.editMessageText(detailedMsg);

            await logger.command(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Post to channel',
                'SUCCESS',
                `Posted ${postData.movieData.title} to channel ${postData.channelInfo}`
            );

            delete bot.context.postData[postId];

        } catch (error) {
            console.error('Error sending post to channel:', error);
            await ctx.answerCbQuery('❌ Error sending post');
            await ctx.editMessageText('Error sending post to channel. Please check bot permissions and try again.');

            await logger.error(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Post to channel',
                'FAILED',
                error.message
            );
        }
    });

    bot.action(/^mcancel_(.+)$/, async (ctx) => {
        try {
            setTimeout(async () => {
                await ctx.deleteMessage()
            }, 10000)

            const postId = ctx.match[1];

            if (bot.context.postData && bot.context.postData[postId]) {
                delete bot.context.postData[postId];
            }

            await ctx.answerCbQuery('Post cancelled');
            await ctx.editMessageText('❌ Post cancelled.');

        } catch (error) {
            console.error('Error cancelling post:', error);
            await ctx.answerCbQuery('Error cancelling post');
            await ctx.editMessageText('Error occurred while cancelling post.');
        }
    });

    bot.on('text', async (ctx, next) => {
    try {
        if (!bot.context.movieButtonEditContext) {
            return next();
        }

        const activeContext = Object.entries(bot.context.movieButtonEditContext).find(
            ([contextId, data]) => data.adminId === ctx.from.id &&
                (Date.now() - parseInt(contextId.split('_').pop())) < 300000
        );

        if (!activeContext) {
            return next();
        }

        const [contextId, contextData] = activeContext;
        const messageText = ctx.message.text.trim();

        if (contextData.step === 'name') {
            contextData.newButtonName = messageText;
            contextData.step = 'link';

            await ctx.reply(
                `✅ Button name set to: **${messageText}**\n\nNow please send the link for this button:`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Go Back', `mgobackedit_${contextId}`)]])
                }
            );

            setTimeout(async () => {
                try {
                    await ctx.deleteMessage(ctx.message.message_id);
                } catch (e) { }
            }, 2000);

        } else if (contextData.step === 'link') {
            if (!messageText.startsWith('http://') && !messageText.startsWith('https://')) {
                return ctx.reply('❌ Please provide a valid URL starting with http:// or https://');
            }

            contextData.newButtonLink = messageText;

            // Get post from database
            const moviePost = await MoviePost.findByPostId(contextData.postId);
            if (!moviePost) {
                return ctx.reply('❌ Post not found in database.');
            }

            const updatedDownloadLinks = [...moviePost.downloadLinks];

            if (contextData.isNewButton) {
                updatedDownloadLinks.push(`${contextData.newButtonName} = ${contextData.newButtonLink}`);
            } else {
                updatedDownloadLinks[contextData.buttonIndex] = `${contextData.newButtonName} = ${contextData.newButtonLink}`;
            }

            const updatedPost = createMoviePost(moviePost.movieData, updatedDownloadLinks, contextData.postId);

            try {
                // Check if the post has a poster (photo) or is text-only
                if (moviePost.posterUrl) {
                    // Post has photo, use editMessageCaption
                    await ctx.telegram.editMessageCaption(
                        moviePost.channelId,
                        moviePost.messageId,
                        undefined,
                        updatedPost.caption,
                        {
                            parse_mode: 'HTML',
                            ...updatedPost.keyboard
                        }
                    );
                } else {
                    // Post is text-only, use editMessageText
                    await ctx.telegram.editMessageText(
                        moviePost.channelId,
                        moviePost.messageId,
                        undefined,
                        updatedPost.caption,
                        {
                            parse_mode: 'HTML',
                            ...updatedPost.keyboard
                        }
                    );
                }

                // Update database
                await MoviePost.updateDownloadLinks(contextData.postId, updatedDownloadLinks);

                const actionType = contextData.isNewButton ? 'added' : 'updated';
                
                // Show success message with navigation options
                await ctx.reply(
                    `✅ Button "${contextData.newButtonName}" ${actionType} successfully!\n\nWhat would you like to do next?`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🔧 Continue Editing', `mupdatebtns_${contextData.postId}`)],
                        [Markup.button.callback('🔙 Main Menu', `mgoback_${contextData.postId}`)],
                        [Markup.button.callback('❌ Close', `mclose_${contextData.postId}`)]
                    ])
                );

                await logger.command(
                    ctx.from.id,
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                    `Button ${actionType}`,
                    'SUCCESS',
                    `${actionType} button for post ID: ${contextData.postId}`
                );

                delete bot.context.movieButtonEditContext[contextId];

                setTimeout(async () => {
                    try {
                        await ctx.deleteMessage(ctx.message.message_id);
                    } catch (e) { }
                }, 2000);

            } catch (editError) {
                console.error('Error editing message:', editError);
                
                // More detailed error handling
                let errorMessage = '❌ Error updating the post.';
                
                if (editError.description?.includes('message is not modified')) {
                    errorMessage = '❌ No changes detected in the post content.';
                } else if (editError.description?.includes('message to edit not found')) {
                    errorMessage = '❌ Original message not found. It may have been deleted.';
                } else if (editError.description?.includes('there is no text in the message to edit')) {
                    errorMessage = '❌ Cannot edit this message type. Please try recreating the post.';
                } else if (editError.description?.includes('not enough rights')) {
                    errorMessage = '❌ Bot doesn\'t have permission to edit messages in this channel.';
                } else {
                    errorMessage = '❌ Error updating the post. Please check bot permissions and try again.';
                }
                
                await ctx.reply(errorMessage);

                await logger.error(
                    ctx.from.id,
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                    'Button update',
                    'FAILED',
                    `Edit error for post ID ${contextData.postId}: ${editError.message}`
                );
            }
        }

    } catch (error) {
        console.error('Error in button edit text handler:', error);
        return next();
    }
});

    setInterval(() => {
        if (bot.context.movieButtonEditContext) {
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            Object.entries(bot.context.movieButtonEditContext).forEach(([contextId, data]) => {
                const contextTimestamp = parseInt(contextId.split('_').pop());
                if (contextTimestamp < fiveMinutesAgo) {
                    delete bot.context.movieButtonEditContext[contextId];
                }
            });
        }
    }, 300000);

    setInterval(() => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        if (bot.context.postedMovieMessages) {
            Object.entries(bot.context.postedMovieMessages).forEach(([postId, data]) => {
                if (new Date(data.createdAt) < oneDayAgo) {
                    delete bot.context.postedMovieMessages[postId];
                }
            });
        }

        if (bot.context.movieSearchCache) {
            Object.entries(bot.context.movieSearchCache).forEach(([queryId, data]) => {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                const queryTimestamp = parseInt(queryId.split('_')[1]);
                if (new Date(queryTimestamp) < oneHourAgo) {
                    delete bot.context.movieSearchCache[queryId];
                }
            });
        }

        if (bot.context.postData) {
            Object.entries(bot.context.postData).forEach(([postId, data]) => {
                const postTimestamp = parseInt(postId.split('_')[1]);
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                if (new Date(postTimestamp) < oneHourAgo) {
                    delete bot.context.postData[postId];
                }
            });
        }

        if (bot.context.linkAdditionContext) {
            Object.entries(bot.context.linkAdditionContext).forEach(([contextId, data]) => {
                const contextTimestamp = parseInt(contextId.split('_')[2]);
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                if (new Date(contextTimestamp) < fiveMinutesAgo) {
                    delete bot.context.linkAdditionContext[contextId];
                }
            });
        }
    }, 3600000);
    bot.context.postedMovieMessages = bot.context.postedMovieMessages || {};
    bot.context.movieSearchCache = bot.context.movieSearchCache || {};
    bot.context.postData = bot.context.postData || {};
    bot.context.linkAdditionContext = bot.context.linkAdditionContext || {};
    bot.context.movieButtonEditContext = bot.context.movieButtonEditContext || {};
};

setInterval(async () => {
    try {
        await MoviePost.cleanupOldPosts();
    } catch (error) {
        console.error('Error cleaning up old Movie posts:', error);
    }
}, 24 * 60 * 60 * 1000);

module.exports = setupPostCommand;