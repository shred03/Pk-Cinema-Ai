const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();
const File = require('./models/File');
const Admin = require('./models/Admin');
const User = require('./models/User');
const setupBroadcast = require('./plugins/broadcast');
const descriptions = require('./script');
const express = require('express');
const Logger = require('./logs/Logs');
const app = express();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_IDS = process.env.ADMIN_IDS.split(',').map(id => parseInt(id));
const TARGET_CHANNEL = process.env.TARGET_CHANNEL;
const FORCE_CHANNEL_ID = process.env.FORCE_CHANNEL_ID;
const FORCE_CHANNEL_USERNAME = process.env.FORCE_CHANNEL_USERNAME ||'pirecykings2';
const AUTO_DELETE = process.env.AUTO_DELETE_FILES === 'true';
const DELETE_MINUTES = parseInt(process.env.AUTO_DELETE_TIME) || 30;
const logger = new Logger(bot, process.env.LOG_CHANNEL_ID);
setupBroadcast(bot, logger);

const mainKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🏠 Home', 'home')],
    [
        Markup.button.callback('🛠 Support', 'support'),
        Markup.button.callback('ℹ️ About', 'about')
    ],
    [Markup.button.callback('📋 Commands', 'commands')],
]);

const isAdmin = async (ctx, next) => {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
        return ctx.reply('❌ 𝙊𝙣𝙡𝙮 𝙖𝙙𝙢𝙞𝙣𝙨 𝙘𝙖𝙣 𝙪𝙨𝙚 𝙩𝙝𝙞𝙨 𝙘𝙤𝙢𝙢𝙖𝙣𝙙');
    }
    return next();
};

const generateUniqueId = () => crypto.randomBytes(8).toString('hex');

const extractMessageId = (link) => {
    try {
        const url = new URL(link);
        return parseInt(url.pathname.split('/').pop());
    } catch (error) {
        return null;
    }
};

const getMessageFromChannel = async (ctx, messageId) => {
    try {
        const forwardedMsg = await ctx.telegram.forwardMessage(
            ctx.chat.id,
            TARGET_CHANNEL,
            messageId,
            { disable_notification: true }
        );
        await ctx.telegram.deleteMessage(ctx.chat.id, forwardedMsg.message_id);
        return forwardedMsg;
    } catch (error) {
        console.error('Error getting message:', error);
        return null;
    }
};

// Updated store function with caption handling
const storeFileFromMessage = async (message, uniqueId, adminId) => {
    let fileData = null;
    const originalCaption = message.caption || '';

    if (message.document) {
        fileData = {
            file_name: message.document.file_name,
            file_id: message.document.file_id,
            file_type: 'document',
            original_caption: originalCaption,
            stored_by: adminId
        };
    } else if (message.photo) {
        fileData = {
            file_name: 'photo.jpg',
            file_id: message.photo[message.photo.length - 1].file_id,
            file_type: 'photo',
            original_caption: originalCaption,
            stored_by: adminId
        };
    } else if (message.video) {
        fileData = {
            file_name: message.video.file_name || 'video.mp4',
            file_id: message.video.file_id,
            file_type: 'video',
            original_caption: originalCaption,
            stored_by: adminId
        };
    } else if (message.animation) {
        fileData = {
            file_name: 'animation.gif',
            file_id: message.animation.file_id,
            file_type: 'animation',
            original_caption: originalCaption,
            stored_by: adminId
        };
    } else if (message.sticker) {
        fileData = {
            file_name: 'sticker.webp',
            file_id: message.sticker.file_id,
            file_type: 'sticker',
            original_caption: originalCaption,
            stored_by: adminId
        };
    }

    if (fileData) {
        const newFile = new File({
            ...fileData,
            file_link: message.link || '',
            channel_id: TARGET_CHANNEL,
            is_multiple: true,
            unique_id: uniqueId,
            message_id: message.message_id
        });
        await newFile.save();
        return true;
    }
    return false;
};

// Updated /link command with adminId
bot.command(['link', 'sl'], isAdmin, async (ctx) => {
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            await logger.command(
                ctx.from.id,
                ctx.message.text,
                ctx.from.first_name || 'Unknown',
                'Link command used',
                'FAILED',
                'No Link Provided'
            );
            return ctx.reply('Please provide the message link in the following format:\n/link https://t.me/c/xxxxx/123');
        }

        const messageId = extractMessageId(args[0]);
        if (!messageId) return ctx.reply('Invalid message link format.');

        const message = await getMessageFromChannel(ctx, messageId);
        if (!message) return ctx.reply('Message not found or not accessible.');

        const uniqueId = generateUniqueId();
        const stored = await storeFileFromMessage(message, uniqueId, ctx.from.id);

        if (stored) {
            const retrievalLink = `https://t.me/${ctx.botInfo.username}?start=${uniqueId}`;
            await logger.command(
                ctx.from.id,
                ctx.from.first_name || 'Unknown',
                'Link command used',
                'SUCCESS',
                `File stored with ID: ${retrievalLink}`
            );
            await ctx.reply(`✅ File stored successfully!\n🔗 Retrieval link: ${retrievalLink}`);
        } else {
            await ctx.reply('No supported file found in the message.');
        }
    } catch (error) {
        await logger.error(
            ctx.from.id,
            ctx.from.first_name || 'Unknown',
            'Link command used',
            'FAILED',
            error.message
        );
        console.error('Error storing file from link:', error);
        await ctx.reply('Error storing file. Please check if the link is from the target channel.');
    }
});

// Updated /batch command with adminId
bot.command(['batch', 'ml'], isAdmin, async (ctx) => {
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length !== 2) {
            await logger.command(
                ctx.from.id,
                ctx.from.first_name || 'Unknown',
                'Batch command used',
                'FAILED',
                'No Link Provided'
            );
            return ctx.reply('Please provide the start and end message links in the following format:\n/batch https://t.me/c/xxxxx/123 https://t.me/c/xxxxx/128');
        }

        const startId = extractMessageId(args[0]);
        const endId = extractMessageId(args[1]);
        if (!startId || !endId) return ctx.reply('Invalid message link format.');
        if (endId < startId) return ctx.reply('End message ID must be greater than start message ID.');
        if (endId - startId > 100) return ctx.reply('Maximum range is 100 messages.');

        const uniqueId = generateUniqueId();
        let storedCount = 0;
        let progressMsg = await ctx.reply('Starting to process messages...');

        for (let msgId = startId; msgId <= endId; msgId++) {
            try {
                const message = await getMessageFromChannel(ctx, msgId);
                if (message) {
                    const stored = await storeFileFromMessage(message, uniqueId, ctx.from.id);
                    if (stored) storedCount++;
                }
                if (msgId % 10 === 0) {
                    await ctx.telegram.editMessageText(
                        ctx.chat.id,
                        progressMsg.message_id,
                        null,
                        `Processing messages... ${msgId - startId + 1}/${endId - startId + 1}`
                    );
                }
            } catch (error) {
                console.error(`Error processing message ${msgId}:`, error);
            }
        }

        await ctx.telegram.deleteMessage(ctx.chat.id, progressMsg.message_id);
        if (storedCount > 0) {
            const retrievalLink = `https://t.me/${ctx.botInfo.username}?start=${uniqueId}`;
            await logger.command(
                ctx.from.id,
                ctx.from.first_name || 'Unknown',
                'Batch command used',
                'SUCCESS',
                `Stored ${storedCount} files with URL: ${retrievalLink}`
            );
            await ctx.reply(`Successfully stored ${storedCount} files!\nRetrieval link: ${retrievalLink}`);
        } else {
            await ctx.reply('No supported files found in the specified range.');
        }
    } catch (error) {
        await logger.error(
            ctx.from.id,
            ctx.from.first_name || 'Unknown',
            'Batch command used',
            'FAILED',
            error.message
        );
        console.error('Error storing files from range:', error);
        await ctx.reply('Error storing files. Please check if the links are from the target channel.');
    }
});

// Updated file retrieval logic in start command
bot.command('start', async (ctx) => {
    try {
        await User.findOneAndUpdate(
            { user_id: ctx.from.id },
            {
                user_id: ctx.from.id,
                username: ctx.from.username,
                first_name: ctx.from.first_name,
                last_name: ctx.from.last_name
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('Error updating user:', error);
    }
    const uniqueId = ctx.message.text.split(' ')[1];
    
    if (uniqueId) {
        try {
            const files = await File.find({ unique_id: uniqueId }).sort({ message_id: 1 });
            if (!files.length) return ctx.reply('Files not found.');
    
            if(!ADMIN_IDS.includes(ctx.from.id)){
                try {
                    const member = await ctx.telegram.getChatMember(FORCE_CHANNEL_ID, ctx.from.id)
                    if(member.status == 'left' || member.status == 'kicked'){
                        const joinKeyboard = Markup.inlineKeyboard([
                            Markup.button.url('Join Channel', `https://t.me/${FORCE_CHANNEL_USERNAME}`),
                            Markup.button.callback('✅ I\'ve Joined', `check_join_${uniqueId}` )
                        ]);
                        await ctx.reply('⚠️ To access the files, please join our channel first.', joinKeyboard);
                        return;
                    }
                } catch (error) {
                    await ctx.reply('Error verifying channel membership');
                    return;
                }
            }
    
            const adminId = files[0].stored_by;
            let admin = null;
            if (adminId) {
                admin = await Admin.findOne({ admin_id: adminId });
            }
    
            await logger.command(
                ctx.from.id,
                ctx.from.first_name || 'Unknown',
                'File retrieval command used',
                'SUCCESS',
                `Retrieved ${files.length} files with URL: https://t.me/${ctx.botInfo.username}?start=${uniqueId}`
            );
    
            let sendingMsg = await ctx.reply(`⌛️ Sending ${files.length} file(s)...`);
            const sentMessages = [];
    
            // If auto-delete is enabled, send warning first
            if (AUTO_DELETE) {
                const warningMsg = await ctx.reply(`⚠️ Warning! These files will be automatically deleted in ${DELETE_MINUTES} minutes. Forward them now to keep copies!`);
                sentMessages.push(warningMsg.message_id);
            }
    
            // Send all files once
            for (const file of files) {
                try {
                    const caption = file.original_caption || '';    
                    let sentMessage;
                    switch (file.file_type) {
                        case 'document':
                            sentMessage = await ctx.telegram.sendDocument(ctx.chat.id, file.file_id, { caption });
                            break;
                        case 'photo':
                            sentMessage = await ctx.telegram.sendPhoto(ctx.chat.id, file.file_id, { caption });
                            break;
                        case 'video':
                            sentMessage = await ctx.telegram.sendVideo(ctx.chat.id, file.file_id, { caption });
                            break;
                        case 'animation':
                            sentMessage = await ctx.telegram.sendAnimation(ctx.chat.id, file.file_id, { caption });
                            break;
                        case 'sticker':
                            sentMessage = await ctx.telegram.sendSticker(ctx.chat.id, file.file_id);
                            break;
                    }
                    if (sentMessage) {
                        sentMessages.push(sentMessage.message_id);
                    }
                } catch (error) {
                    console.error(`Error sending file ${file.file_name}:`, error);
                }
            }
    
            await ctx.telegram.deleteMessage(ctx.chat.id, sendingMsg.message_id);
            const completionMsg = await ctx.reply('✅ All files sent!');
            sentMessages.push(completionMsg.message_id);
    
            // If auto-delete is enabled, schedule deletion
            if (AUTO_DELETE) {
                setTimeout(async () => {
                    try {
                        for (const msgId of sentMessages) {
                            await ctx.telegram.deleteMessage(ctx.chat.id, msgId);
                        }
                        await ctx.reply('🗑️ Files have been automatically deleted.');
                    } catch (error) {
                        console.error('Auto-delete error:', error);
                    }
                }, DELETE_MINUTES * 60 * 1000);
            }
    
        } catch (error) {
            await logger.error(
                ctx.from.id,
                ctx.from.first_name || 'Unknown',
                'Start command used',
                'FAILED',
                error.message
            );
            console.error('Error retrieving files:', error);
            await ctx.reply('Error retrieving files. Please try again.');
        }
    } else {
        try {
            await logger.command(
                ctx.from.id,
                ctx.from.first_name || 'Unknown',
                'start command used',
                'SUCCESS',
                `Welcome message sent!`
            )

            await ctx.replyWithPhoto(descriptions.welcome_image, {
                caption: descriptions.welcome_text,
                parse_mode: 'Markdown',
                ...mainKeyboard
            });
        } catch (error) {
            await ctx.reply('Error starting bot. Please try again.');
        }
    }
});

bot.action(/^check_join_(.+)/, async (ctx) => {
    const uniqueId = ctx.match[1];
    try {
        const member = await ctx.telegram.getChatMember(FORCE_CHANNEL_ID, ctx.from.id);
        if (['left', 'kicked'].includes(member.status)) {
            await ctx.answerCbQuery('❌ You haven\'t joined the channel yet!');
        } else {
            await ctx.deleteMessage();
            // Trigger file sending
            ctx.reply('Go back to the post and click again to get the files');
        }
    } catch (error) {
        await ctx.answerCbQuery('Error verifying membership.');
    }
});

bot.action('home', async (ctx) => {
    try {
        await ctx.editMessageCaption(descriptions.home, {
            parse_mode: 'Markdown',
            ...mainKeyboard
        });
    } catch (error) {
        console.error('Error handling home button:', error);
    }
});

bot.action('support', async (ctx) => {
    try {
        await ctx.editMessageCaption(descriptions.support, {
            parse_mode: 'Markdown',
            ...mainKeyboard
        });
    } catch (error) {
        console.error('Error handling support button:', error);
    }
});

bot.action('about', async (ctx) => {
    try {
        await ctx.editMessageCaption(descriptions.about, {
            parse_mode: 'Markdown',
            ...mainKeyboard
        });
    } catch (error) {
        console.error('Error handling about button:', error);
    }
});

bot.action('commands', async (ctx) => {
    try {
        await ctx.editMessageCaption(descriptions.commands, {
            parse_mode: 'Markdown',
            ...mainKeyboard
        });
    } catch (error) {
        console.error('Error handling commands button:', error);
    }
});

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
    console.log(`Health check server is running on port ${PORT}`);
});
const startBot = async () => {
    try {
        await bot.launch();
        console.log('✅ Bot is running...');
    } catch (error) {
        console.error('❌ Error starting bot:', error);
    }
};

startBot();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));