const { Markup } = require('telegraf');
const Request = require('../models/Request');
const crypto = require('crypto');
const config = require('../config');


const REQUEST_CHANNEL_ID = config.REQUEST_CHANNEL_ID;

const generateRequestId = () => crypto.randomBytes(5).toString('hex');

const setupRequestSystem = (bot, logger, ADMIN_IDS) => {

    bot.hears(/#request (.+)/i, async (ctx) => {
        try {
            setTimeout(async () => {
                await ctx.deleteMessage()
            }, 10000);
            const requestContent = ctx.match[1].trim();
            
            if (!requestContent) {
                return ctx.reply('❌ Please provide request content after #request');
            }

            const requestId = generateRequestId();
            const userId = ctx.from.id;
            const username = ctx.from.username || 'No username';
            const firstName = ctx.from.first_name || 'Unknown';
            
            let originChannelName = 'Private Chat';
            if (ctx.chat.type !== 'private') {
                try {
                    const chatInfo = await ctx.telegram.getChat(ctx.chat.id);
                    originChannelName = chatInfo.title || chatInfo.username || 'Unknown Group';
                } catch (error) {
                    originChannelName = 'Unknown Group';
                }
            }

            const newRequest = new Request({
                user_id: userId,
                request_id: requestId,
                requested_by: `${firstName} (@${username})`,
                request_content: requestContent,
                request_originId: ctx.chat.id.toString(),
                request_forwardId: REQUEST_CHANNEL_ID,
                isRequestCompleted: false,
                requestAcceptedBy: null
            });

            await newRequest.save();

            const requestMessage = `🔔 <b>New Request</b>\n\n` +
                `👤 <b>User:</b> ${firstName} (@${username})\n` +
                `🆔 <b>UID:</b> ${userId}\n` +
                `📍 <b>From:</b> ${originChannelName}\n` +
                `📋 <b>Request:</b> ${requestContent}\n` +
                `🔢 <b>RID:</b> <code>${requestId}</code>`;

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Accept', `req_accepted_${requestId}`),
                    Markup.button.callback('❌ Decline', `req_decline_${requestId}`)
                ]
            ]);

            await ctx.telegram.sendMessage(REQUEST_CHANNEL_ID, requestMessage, {
                parse_mode: 'HTML',
                ...keyboard
            });

            await ctx.reply(`<b>👤 User:</b> @${username}\n\n📋 <b>Request:</b> ${requestContent}\n🔢 <b>RID:</b> <code>${requestId}</code>\n\n<i>✅ Your request has been submitted!\n⏳ Please wait for admin response.</i>`, {
                parse_mode: 'HTML'
            });

            await logger.command(
                userId,
                `${firstName} (@${username})`,
                'Request submitted',
                'SUCCESS',
                `Request: ${requestContent} | RID: ${requestId}`
            );

        } catch (error) {
            console.error('Error processing request:', error);
            await ctx.reply('❌ Error submitting request. Please try again.');
            
            await logger.error(
                ctx.from.id,
                `${ctx.from.first_name} (@${ctx.from.username || 'Unknown'})`,
                'Request submission',
                'FAILED',
                error.message
            );
        }
    });

    bot.action(/^req_accepted_(.+)/, async (ctx) => {
        try {
            if (!ADMIN_IDS.includes(ctx.from.id)) {
                return ctx.answerCbQuery('❌ Only admins can use this button');
            }

            const requestId = ctx.match[1];
            const request = await Request.findOne({ request_id: requestId });

            if (!request) {
                return ctx.answerCbQuery('❌ Request not found');
            }

            if (request.isRequestCompleted) {
                return ctx.answerCbQuery('⚠️ This request has already been processed');
            }

            await Request.updateOne(
                { request_id: requestId },
                {
                    isRequestCompleted: true,
                    requestAcceptedBy: ctx.from.id
                }
            );

            try {
                await ctx.telegram.sendMessage(
                    request.user_id,
                    `✅ <b>Request Accepted!</b>\n\n` +
                    `📋 <b>Your Request:</b> <code>${request.request_content}</code>\n` +
                    `🔢 <b>RID:</b> <code>${requestId}</code>\n\n` +
                    `<b>Your requested has been accepted, file will be uploaded in our channel soon. Thank You!</b>`,
                    { parse_mode: 'HTML' }
                );
            } catch (error) {
                console.error('Error sending accepted message to user:', error);
            }

            const updatedMessage = ctx.callbackQuery.message.text + `\n\n✅ <b>ACCEPTED</b> by ${ctx.from.first_name} (@${ctx.from.username || 'admin'})`;
            
            await ctx.editMessageText(updatedMessage, { parse_mode: 'HTML' });
            await ctx.answerCbQuery('✅ Request marked as accepted and user notified');

            await logger.command(
                ctx.from.id,
                `${ctx.from.first_name} (@${ctx.from.username || 'admin'})`,
                'Request accepted',
                'SUCCESS',
                `RID: ${requestId} | User: ${request.user_id}`
            );

        } catch (error) {
            console.error('Error handling accepted request:', error);
            await ctx.answerCbQuery('❌ Error processing request');
        }
    });

    bot.action(/^req_decline_(.+)/, async (ctx) => {
        try {
            if (!ADMIN_IDS.includes(ctx.from.id)) {
                return ctx.answerCbQuery('❌ Only admins can use this button');
            }

            const requestId = ctx.match[1];
            const request = await Request.findOne({ request_id: requestId });

            if (!request) {
                return ctx.answerCbQuery('❌ Request not found');
            }

            if (request.isRequestCompleted) {
                return ctx.answerCbQuery('⚠️ This request has already been processed');
            }

            await Request.updateOne(
                { request_id: requestId },
                {
                    isRequestCompleted: true,
                    requestAcceptedBy: ctx.from.id
                }
            );

            try {
                await ctx.telegram.sendMessage(
                    request.user_id,
                    `❌ <b>Request Declined</b>\n\n` +
                    `📋 <b>Your Request:</b> <code>${request.request_content}</code>\n` +
                    `🔢 <b>RID:</b> <code>${requestId}</code>\n\n` +
                    `<i>Your request has been declined by admin. Please try again with correct format use <code>/format</code>.</i>`,
                    { parse_mode: 'HTML' }
                );
            } catch (error) {
                console.error('Error sending decline message to user:', error);
            }

            const updatedMessage = ctx.callbackQuery.message.text + `\n\n❌ <b>DECLINED</b> by ${ctx.from.first_name} (@${ctx.from.username || 'admin'})`;
            
            await ctx.editMessageText(updatedMessage, { parse_mode: 'HTML' });
            await ctx.answerCbQuery('❌ Request declined and user notified');

            await logger.command(
                ctx.from.id,
                `${ctx.from.first_name} (@${ctx.from.username || 'admin'})`,
                'Request declined',
                'SUCCESS',
                `RID: ${requestId} | User: ${request.user_id}`
            );

        } catch (error) {
            console.error('Error handling declined request:', error);
            await ctx.answerCbQuery('❌ Error processing request');
        }
    });

    bot.command(['format'], async (ctx) =>{
        try{
            setTimeout(async () => {
                await ctx.deleteMessage()
            }, 1000);
            await ctx.reply("#request {movie/series/anime-name} {release-year} {quality}\n\n E.g: <code>#request Kalki 2898AD 2024 1080p</code>", {parse_mode: "HTML"});
        }catch(error){
            console.error('Error fetching requests format:', error);
            await ctx.reply('❌ Error fetching request format');
        }
    })

    bot.command(['requests', 'req'], async (ctx) => {
        try {
            setTimeout(async () => {
                await ctx.deleteMessage()
            }, 5000);
            if (!ADMIN_IDS.includes(ctx.from.id)) {
                return ctx.reply('❌ Only admins can use this command');
            }

            const pendingRequests = await Request.find({ isRequestCompleted: false }).sort({ _id: -1 });
            const completedRequests = await Request.find({ isRequestCompleted: true }).sort({ _id: -1 }).limit(5);

            let message = `📊 <b>Request Statistics</b>\n\n`;
            message += `⏳ <b>Pending Requests:</b> ${pendingRequests.length}\n`;
            message += `✅ <b>Recently Completed:</b> ${completedRequests.length}/5\n\n`;

            if (pendingRequests.length > 0) {
                message += `📋 <b>Pending Requests:</b>\n`;
                pendingRequests.slice(0, 10).forEach((req, index) => {
                    message += `${index + 1}. <code>${req.request_id}</code> - ${req.requested_by}\n`;
                    message += `   📝 ${req.request_content.substring(0, 50)}${req.request_content.length > 50 ? '...' : ''}\n\n`;
                });
            }

            if (completedRequests.length > 0) {
                message += `✅ <b>Recently Completed:</b>\n`;
                completedRequests.forEach((req, index) => {
                    message += `${index + 1}. <code>${req.request_id}</code> - ${req.requested_by}\n`;
                });
            }

            await ctx.reply(message, { parse_mode: 'HTML' });

        } catch (error) {
            console.error('Error fetching requests:', error);
            await ctx.reply('❌ Error fetching request statistics');
        }
    });

    bot.command(['myreq', 'myrequests'], async (ctx) => {
        try {
            setTimeout(async () => {
                await ctx.deleteMessage()
            }, 5000);
            const userRequests = await Request.find({user_id: ctx.from.id }).sort({ _id: -1 }).limit(10);

            if (userRequests.length === 0) {
                return ctx.reply('📭 You haven\'t made any requests yet.\n\nTo make a request, type: <code>#request your request here</code>', {
                    parse_mode: 'HTML'
                });
            }
            const requestedUser = [...new Set(userRequests.map(item => item.requested_by))][0];

            let message = `<b><u>📋 ${requestedUser} Recent Requests</u></b>\n\n`;
            userRequests.forEach((req, index) => {
                const status = req.isRequestCompleted ? '✅ Completed' : '⏳ Pending';
                message += `${index + 1}. <b>RID:</b> <code>${req.request_id}</code>\n`;
                message += `   ✦<code> ${req.request_content}</code>\n`;
                message += `   ✦<b> Status:</b> ${status}\n\n`;
            });

            message += `<i>💡 To make a new request, type: <code>#request your request here</code></i>`;

            await ctx.reply(message, { parse_mode: 'HTML' });

        } catch (error) {
            console.error('Error fetching user requests:', error);
            await ctx.reply('❌ Error fetching your requests');
        }
    });
};

module.exports = setupRequestSystem;