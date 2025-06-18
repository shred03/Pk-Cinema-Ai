module.exports = (bot) => {
  bot.command('help', (ctx) => {
    const HELP_TEXT = `
<b>Available Commands:</b>

• <code>/start</code> - Start the bot  
• <code>/link</code> or <code>/sl</code> - Save file from message link  
• <code>/batch</code> or <code>/ml</code> - Save files from a message range  
• <code>/post</code> <i>movie_name</i> <i>link</i> - Create movie post  
• <code>/tvpost</code> <i>series_name</i> <i>link</i> - Create series post  
• <code>/setchannel</code> or <code>/sc</code> <i>channelId</i> - Set target channel for posts  
• <code>/setsticker</code> - Set sticker after posts  
• <code>/token</code> - Enable or disable token verification  
• <code>/filel</code> - Enable or disable file limit  
• <code>/setl</code> [number] - Set file limit  
• <code>/lstats</code> - View current limit stats  
• <code>/rsl</code> &lt;userid&gt; - Reset stats for one user or all  
• <code>/broadcast</code> - Send broadcast message  
• <code>/stats</code> - View bot stats
    `;
    ctx.reply(HELP_TEXT, { parse_mode: 'HTML' });
  });
};
