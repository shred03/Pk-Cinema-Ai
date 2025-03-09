const axios = require('axios');
const { Markup } = require('telegraf');
const Logger = require('../logs/Logs');
const Post = require('../models/Post');
const config = require('../config')


const TMDB_API_KEY = config.TMDB_API_KEY
const TMDB_BASE_URL = config.TMDB_BASE_URL

/**
 * Setup post command functionality for the bot
 * @param {Telegraf} bot - Telegraf bot instance
 * @param {Object} logger - Logger instance for logging command usage
 * @param {Array} ADMIN_IDS - Array of admin IDs allowed to use this command
 */
const setupPostCommand = (bot, logger, ADMIN_IDS) => {
    const isAdmin = async (ctx, next) => {
        if (!ADMIN_IDS.includes(ctx.from.id)) {
            return ctx.reply('❌ 𝙊𝙣𝙡𝙮 𝙖𝙙𝙢𝙞𝙣𝙨 𝙘𝙖𝙣 𝙪𝙨𝙚 𝙩𝙝𝙞𝙨 𝙘𝙤𝙢𝙢𝙖𝙣𝙙');
        }
        return next();
    };

    /**
     * Fetches movie data from TMDB API by movie name
     * @param {string} movieName - Name of the movie to search
     * @returns {Object|null} - Movie data object or null if not found
     */
    const fetchMovieData = async (movieName) => {
        try {
            // Search for the movie
            const searchResponse = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
                params: {
                    api_key: TMDB_API_KEY,
                    query: movieName,
                    include_adult: false,
                    language: 'en-US',
                    page: 1
                }
            });

            if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
                return null;
            }

            // Get the first result (most relevant)
            const movieId = searchResponse.data.results[0].id;

            // Get detailed movie info
            const movieResponse = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
                params: {
                    api_key: TMDB_API_KEY,
                    language: 'en-US'
                }
            });

            return movieResponse.data;
        } catch (error) {
            console.error('Error fetching movie data:', error);
            return null;
        }
    };

    /**
     * Formats movie genres into a string
     * @param {Array} genres - Array of genre objects
     * @returns {string} - Formatted genre string
     */
    const formatGenres = (genres) => {
        return genres.map(genre => genre.name).join(', ');
    };

    /**
     * Creates a formatted movie post
     * @param {Object} movieData - Movie data from TMDB
     * @param {string} downloadLink - Link for the download button
     * @returns {Object} - Formatted post with caption and keyboard
     */
    const createMoviePost = (movieData, downloadLink) => {
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
        
        // Create the caption with quote formatting
        const caption = `<b>${movieData.title} (${releaseYear})</b>

» 𝗔𝘂𝗱𝗶𝗼: Hindi+English (E-subs)
» 𝗤𝘂𝗮𝗹𝗶𝘁𝘆: 480p | 720p | 1080p 
» 𝗚𝗲𝗻𝗿𝗲: ${genres}
» 𝗥𝘂𝗻𝘁𝗶𝗺𝗲: ${formattedRuntime}

» 𝗦𝘆𝗻𝗼𝗽𝘀𝗶𝘀:
<blockquote>${synopsis}</blockquote>
    
<b>@Teamxpirates</b>
<blockquote>[𝗜𝗳 𝗬𝗼𝘂 𝗦𝗵𝗮𝗿𝗲 𝗢𝘂𝗿 𝗙𝗶𝗹𝗲𝘀 𝗪𝗶𝘁𝗵𝗼𝘂𝘁 𝗖𝗿𝗲𝗱𝗶𝘁, 𝗧𝗵𝗲𝗻 𝗬𝗼𝘂 𝗪𝗶𝗹𝗹 𝗯𝗲 𝗕𝗮𝗻𝗻𝗲𝗱]</blockquote>`;

        // Create the download button
        const inlineKeyboard = Markup.inlineKeyboard([
            Markup.button.url('𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐍𝐨𝐰', downloadLink)
        ]);

        return {
            caption,
            keyboard: inlineKeyboard
        };
    };

    /**
     * Gets the poster image URL for a movie
     * @param {Object} movieData - Movie data from TMDB
     * @returns {string|null} - Poster URL or null if not available
     */
    const getMoviePosterUrl = (movieData) => {
        if (movieData.poster_path) {
            return `https://image.tmdb.org/t/p/w500${movieData.poster_path}`;
        }
        return null;
    };

    bot.command(['setsticker', 'ss'], isAdmin, async (ctx) => {
        try {
            // Check if a sticker is forwarded or mentioned
            const repliedMessage = ctx.message.reply_to_message;
            
            if (!repliedMessage || !repliedMessage.sticker) {
                return ctx.reply('❌ Please forward or reply to a sticker with this command');
            }

            const stickerId = repliedMessage.sticker.file_id;

            // Get the admin's current channel setting
            const postSetting = await Post.getLatestForAdmin(ctx.from.id);
            
            if (!postSetting) {
                return ctx.reply('❌ No channel set. Please use /setchannel command first.');
            }

            // Update the post setting with the sticker ID
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
            const args = ctx.message.text.split(' ').slice(1);
            
            if (args.length < 1) {
                return ctx.reply('Please provide a channel ID or username in the format: \n/setchannel @channelUsername\nor\n/setchannel -100xxxxxxxxxx');
            }

            let channelId = args[0];
            let channelUsername = null;

            // Handle username format
            if (channelId.startsWith('@')) {
                channelUsername = channelId.substring(1); // Remove the @ symbol
                try {
                    // Try to get the numeric ID from the username
                    const chat = await ctx.telegram.getChat(channelId);
                    channelId = chat.id.toString();
                } catch (error) {
                    return ctx.reply(`❌ Couldn't find the channel ${channelId}. Make sure the bot is added to the channel as an admin.`);
                }
            }

            // Verify the bot has permission to post in the channel
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

            // Save the channel setting
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

    // Register the post command
    bot.command(['post'], isAdmin, async (ctx) => {
        try {
            const args = ctx.message.text.split(' ').slice(1);
            
            // Check if command has the right format
            if (args.length < 2) {
                await logger.command(
                    ctx.from.id,
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                    'Post command used',
                    'FAILED',
                    'Invalid format'
                );
                return ctx.reply('Please use the format: /post <movieName> <downloadLink>');
            }

            // Extract download link (last argument)
            const downloadLink = args[args.length - 1];
            
            // Extract movie name (all arguments except the last one)
            const movieName = args.slice(0, args.length - 1).join(' ');

            // Fetch movie data from TMDB
            const processingMsg = await ctx.reply('⌛ Fetching movie data...');
            const movieData = await fetchMovieData(movieName);

            if (!movieData) {
                await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
                await logger.command(
                    ctx.from.id,
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                    'Post command used',
                    'FAILED',
                    `Movie not found: ${movieName}`
                );
                return ctx.reply(`❌ Could not find movie: "${movieName}"`);
            }

            // Create the movie post
            const post = createMoviePost(movieData, downloadLink);
            
            // Get the movie poster
            const posterUrl = getMoviePosterUrl(movieData);
            
            // Delete processing message
            await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
            
            // Get the admin's channel setting
            const postSetting = await Post.getLatestForAdmin(ctx.from.id);
            
            if (!postSetting) {
                await logger.command(
                    ctx.from.id,
                    `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                    'Post command used',
                    'FAILED',
                    'No channel set'
                );
                return ctx.reply('❌ No channel set. Please use /setchannel command first.');
            }

            const channelInfo = postSetting.channelUsername ? 
                `@${postSetting.channelUsername}` : 
                postSetting.channelId;
            
            // Create unique ID for this post to use with action buttons
            const postId = `${ctx.from.id}_${Date.now()}`;
            
            // Create confirmation buttons
            const confirmationButtons = Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Post to Channel', `confirm_post_${postId}`),
                    Markup.button.callback('❌ Cancel', `cancel_post_${postId}`)
                ]
            ]);

            // Store the necessary post data with the postId
            bot.context.postData = bot.context.postData || {};
            bot.context.postData[postId] = {
                movieData,
                downloadLink,
                posterUrl,
                post,
                channelId: postSetting.channelId,
                channelInfo
            };
            
            // Send post preview to admin with confirmation buttons
            if (posterUrl) {
                await ctx.replyWithPhoto(posterUrl, {
                    caption: `<b>Preview:</b>\n\n${post.caption}\n\n<i>Ready to post to ${channelInfo}</i>`,
                    parse_mode: 'HTML',
                    ...post.keyboard
                });
            } else {
                await ctx.reply(`<b>Preview:</b>\n\n${post.caption}\n\n<i>Ready to post to ${channelInfo}</i>`, {
                    parse_mode: 'HTML',
                    ...post.keyboard
                });
            }
            
            // Send confirmation message with buttons
            await ctx.reply('Would you like to post this to your channel?', confirmationButtons);
            
            // Log the creation of post preview
            await logger.command(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Post command used',
                'SUCCESS',
                `Created post preview for movie: ${movieData.title}`
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
            await ctx.reply('Error creating movie post. Please try again.');
        }
    });
    
    // Handle confirm post action
     bot.action(/^confirm_post_(.+)$/, async (ctx) => {
        try {
            const postId = ctx.match[1];
            
            // Access post data from bot context
            if (!bot.context.postData || !bot.context.postData[postId]) {
                await ctx.answerCbQuery('❌ Post data not found');
                return ctx.editMessageText('Unable to find post data. Please create a new post.');
            }
            
            const postData = bot.context.postData[postId];
            
            // Get the admin's channel setting again to ensure we have the latest
            const postSetting = await Post.getLatestForAdmin(ctx.from.id);
            
            // Send post to channel
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

            // Forward sticker if set
            if (postSetting && postSetting.stickerId) {
                try {
                    await ctx.telegram.sendSticker(postData.channelId, postSetting.stickerId);
                } catch (stickerError) {
                    console.error('Error sending sticker:', stickerError);
                    // Optionally log the sticker sending error, but don't stop the post process
                }
            }
            
            // Show success message
            await ctx.answerCbQuery('✅ Post sent to channel!');
            await ctx.editMessageText(`✅ Post for "${postData.movieData.title}" has been sent to ${postData.channelInfo} successfully!`);
            
            // Log successful post
            await logger.command(
                ctx.from.id,
                `${ctx.from.first_name} (${ctx.from.username || 'Untitled'})` || 'Unknown',
                'Post to channel',
                'SUCCESS',
                `Posted ${postData.movieData.title} to channel ${postData.channelInfo}`
            );
            
            // Clean up stored data
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
    
    // Handle cancel post action
    bot.action(/^cancel_post_(.+)$/, async (ctx) => {
        try {
            const postId = ctx.match[1];
            
            // Clean up stored data if it exists
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
};

module.exports = setupPostCommand;