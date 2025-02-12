const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();
const File = require('./models/File');
const Admin = require('./models/Admin');
const descriptions = require('./script')
const express = require('express');
const app = express();


mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_IDS = process.env.ADMIN_IDS.split(',').map(id => parseInt(id));
const TARGET_CHANNEL = process.env.TARGET_CHANNEL;

const mainKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🏠 Home', 'home')],
    [
        Markup.button.callback('👨‍💻 Creator', 'creator'),
        Markup.button.callback('ℹ️ About', 'about')
    ],
    [Markup.button.callback('❔ Help', 'help')]
]);

const isAdmin = async (ctx, next) => {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
        return ctx.reply('Sorry, only admins can store files.');
    }
    return next();
};

const generateUniqueId = () => crypto.randomBytes(8).toString('hex');

// Extract message ID from Telegram link
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
        // Using forwardMessage to get the message content
        const forwardedMsg = await ctx.telegram.forwardMessage(
            ctx.chat.id,
            TARGET_CHANNEL,
            messageId,
            { disable_notification: true }
        );
        
        // Immediately delete the forwarded message
        await ctx.telegram.deleteMessage(ctx.chat.id, forwardedMsg.message_id);
        
        return forwardedMsg;
    } catch (error) {
        console.error('Error getting message:', error);
        return null;
    }
};

// Store file from any supported type of message
const storeFileFromMessage = async (message, uniqueId) => {
    let fileData = null;

    if (message.document) {
        fileData = {
            file_name: message.document.file_name,
            file_id: message.document.file_id,
            file_type: 'document'
        };
    } else if (message.photo) {
        fileData = {
            file_name: 'photo.jpg',
            file_id: message.photo[message.photo.length - 1].file_id,
            file_type: 'photo'
        };
    } else if (message.video) {
        fileData = {
            file_name: message.video.file_name || 'video.mp4',
            file_id: message.video.file_id,
            file_type: 'video'
        };
    } else if (message.animation) {
        fileData = {
            file_name: 'animation.gif',
            file_id: message.animation.file_id,
            file_type: 'animation'
        };
    } else if (message.sticker) {
        fileData = {
            file_name: 'sticker.webp',
            file_id: message.sticker.file_id,
            file_type: 'sticker'
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


bot.command(['link', 'sl'], isAdmin, async (ctx) => {
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            return ctx.reply(
                'Please provide the message link in the following format:\n' +
                '/link https://t.me/c/xxxxx/123'
            );
        }

        const messageId = extractMessageId(args[0]);
        if (!messageId) {
            return ctx.reply('Invalid message link format.');
        }

        const message = await getMessageFromChannel(ctx, messageId);
        if (!message) {
            return ctx.reply('Message not found or not accessible.');
        }

        const uniqueId = generateUniqueId();
        const stored = await storeFileFromMessage(message, uniqueId);

        if (stored) {
            const retrievalLink = `https://t.me/${ctx.botInfo.username}?start=${uniqueId}`;
            await ctx.reply(`✅ File stored successfully!\n🔗 Retrieval link: ${retrievalLink}`);
        } else {
            await ctx.reply('No supported file found in the message.');
        }
    } catch (error) {
        console.error('Error storing file from link:', error);
        await ctx.reply('Error storing file. Please check if the link is from the target channel.');
    }
}); 

// Command to store multiple files from a range of messages
bot.command(['batch', 'ml'], isAdmin, async (ctx) => {
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length !== 2) {
            return ctx.reply(
                'Please provide the start and end message links in the following format:\n' +
                '/range https://t.me/c/xxxxx/123 https://t.me/c/xxxxx/128'
            );
        }

        const startId = extractMessageId(args[0]);
        const endId = extractMessageId(args[1]);

        if (!startId || !endId) {
            return ctx.reply('Invalid message link format.');
        }

        if (endId < startId) {
            return ctx.reply('End message ID must be greater than start message ID.');
        }

        if (endId - startId > 100) {
            return ctx.reply('Maximum range is 100 messages.');
        }

        const uniqueId = generateUniqueId();
        let storedCount = 0;
        let progressMsg = await ctx.reply('Starting to process messages...');

        for (let msgId = startId; msgId <= endId; msgId++) {
            try {
                const message = await getMessageFromChannel(ctx, msgId);
                if (message) {
                    const stored = await storeFileFromMessage(message, uniqueId);
                    if (stored) storedCount++;
                }

                // Update progress every 10 messages
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

        // Delete progress message
        await ctx.telegram.deleteMessage(ctx.chat.id, progressMsg.message_id);

        if (storedCount > 0) {
            const retrievalLink = `https://t.me/${ctx.botInfo.username}?start=${uniqueId}`;
            await ctx.reply(
                `Successfully stored ${storedCount} files!\n` +
                `Retrieval link: ${retrievalLink}`
            );
        } else {
            await ctx.reply('No supported files found in the specified range.');
        }
    } catch (error) {
        console.error('Error storing files from range:', error);
        await ctx.reply('Error storing files. Please check if the links are from the target channel.');
    }
});

bot.command(['setcaption', 'sc'], isAdmin, async (ctx) => {
    try {
        const caption = ctx.message.text.split(' ').slice(1).join('\n');
        if (!caption) {
            return ctx.reply(
                'Please provide the caption in the following format:\n' +
                '/setcaption or /sc: Your custom caption here'
            );
        }

        await Admin.findOneAndUpdate(
            { admin_id: ctx.from.id },
            { 
                admin_id: ctx.from.id,
                custom_caption: caption,
                caption_enabled: true
            },
            { upsert: true }
        );

        await ctx.reply('Custom caption set successfully!');
    } catch (error) {
        console.error('Error setting caption:', error);
        await ctx.reply('Error setting caption. Please try again.');
    }
});

// Command to remove custom caption
bot.command(['removecaption', 'rc'], isAdmin, async (ctx) => {
    try {
        await Admin.findOneAndUpdate(
            { admin_id: ctx.from.id },
            { caption_enabled: false }
        );
        await ctx.reply('Custom caption disabled successfully!');
    } catch (error) {
        console.error('Error removing caption:', error);
        await ctx.reply('Error removing caption. Please try again.');
    }
});

// Command to show current caption
bot.command(['showcaption', 'shc'], isAdmin, async (ctx) => {
    try {
        const admin = await Admin.findOne({ admin_id: ctx.from.id });
        if (!admin || !admin.custom_caption) {
            return ctx.reply('No custom caption set.');
        }
        await ctx.reply(
            `Current caption ${admin.caption_enabled ? 'enabled' : 'disabled'}:\n\n` +
            admin.custom_caption
        );
    } catch (error) {
        console.error('Error showing caption:', error);
        await ctx.reply('Error showing caption. Please try again.');
    }
});


bot.command('start', async (ctx) => {
    const uniqueId = ctx.message.text.split(' ')[1];
    
    if (uniqueId) {
        // File retrieval logic
        try {
            const files = await File.find({ unique_id: uniqueId }).sort({ message_id: 1 });
            if (!files.length) {
                return ctx.reply('Files not found.');
            }

            await ctx.reply(`⌛️ Sending ${files.length} file(s)...`);

            // Get admin's custom caption if the file was stored by an admin
            const adminId = files[0].stored_by;
            let customCaption = '';
            if (adminId) {
                const admin = await Admin.findOne({ admin_id: adminId });
                if (admin && admin.caption_enabled) {
                    customCaption = admin.custom_caption;
                }
            }

            for (const file of files) {
                try {
                    const caption = customCaption || `File: ${file.file_name}`;
                    switch (file.file_type) {
                        case 'document':
                            await ctx.telegram.sendDocument(ctx.chat.id, file.file_id, { caption });
                            break;
                        case 'photo':
                            await ctx.telegram.sendPhoto(ctx.chat.id, file.file_id, { caption });
                            break;
                        case 'video':
                            await ctx.telegram.sendVideo(ctx.chat.id, file.file_id, { caption });
                            break;
                        case 'animation':
                            await ctx.telegram.sendAnimation(ctx.chat.id, file.file_id, { caption });
                            break;
                        case 'sticker':
                            await ctx.telegram.sendSticker(ctx.chat.id, file.file_id);
                            break;
                    }
                } catch (error) {
                    console.error(`Error sending file ${file.file_name}:`, error);
                }
            }

            await ctx.reply('✅ All files sent!');
        } catch (error) {
            console.error('Error retrieving files:', error);
            await ctx.reply('Error retrieving files. Please try again.');
        }
    } else {
        // Welcome message with image and buttons
        try {
            await ctx.replyWithPhoto(
                descriptions.welcome_image,
                {
                    caption: descriptions.welcome_text,
                    parse_mode: 'Markdown',
                    ...mainKeyboard
                }
            );
        } catch (error) {
            console.error('Error sending welcome message:', error);
            await ctx.reply('Error starting bot. Please try again.');
        }
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

bot.action('creator', async (ctx) => {
    try {
        await ctx.editMessageCaption(descriptions.creator, {
            parse_mode: 'Markdown',
            ...mainKeyboard
        });
    } catch (error) {
        console.error('Error handling creator button:', error);
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

bot.action('help', async (ctx) => {
    try {
        await ctx.editMessageCaption(descriptions.help, {
            parse_mode: 'Markdown',
            ...mainKeyboard
        });
    } catch (error) {
        console.error('Error handling help button:', error);
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