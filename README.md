<b>🔥 Advanced Telegram File Store Bot 📁</b>

An advanced &amp; powerful Telegram bot that allows storing files from channels and generating shareable links for easy file retrieval. Perfect for creating organized file archives and sharing content efficiently.

<b>🌟 Features</b>

• <b>Single File Storage</b>: Store individual files from channel posts
• <b>Batch File Storage</b>: Store multiple files from a range of messages  
• <b>Custom Captions</b>: Set and manage custom captions for shared files
• <b>Multiple File Types Support</b>:
  ◦ Documents 📄
  ◦ Photos 🖼️
  ◦ Videos 🎥
  ◦ Animations (GIFs) 🎭
  ◦ Stickers 🎯
• <b>Admin Management</b>: Secure admin-only storage capabilities
• <b>Logging System</b>: Comprehensive logging of all bot activities
• <b>User-Friendly Interface</b>: Interactive buttons and clear instructions

<b>📋 Prerequisites</b>

Before setting up the bot, make sure you have:

• Node.js (v14 or higher)
• MongoDB database
• Telegram Bot Token (from <a href="https://t.me/botfather">@BotFather</a>)
• A Telegram channel where the bot is an admin

<b>🚀 Installation</b>

<b>1.</b> Clone the repository:
<pre>git clone https://github.com/shred03/Pk-Cinema-Ai
cd server</pre>

<b>2.</b> Install dependencies:
<pre>npm install</pre>

<b>3.</b> Create a <code>.env</code> file in the root directory with the following variables:
<pre>BOT_TOKEN=bot-token
MONGODB_URI=uri
ADMIN_IDS=id1,id2
DATABASE_FILE_CHANNELS=id1,id2,etc
PORT=8000
AUTO_DELETE_FILES=true
AUTO_DELETE_TIME=10
DATABASE_NAME=datbase-name
LOG_CHANNEL_ID=id
TMDB_API_KEY=api-key-tmdb
SHRINKME_API=api-key
BOT_USERNAME=your_botusername
REDIRECT_DOMAIN=your_domain
WATERMARK_CHANNEL=your_channel_username without '@'</pre>

<b>4.</b> Start the bot:
<pre>npm run start</pre>

<b>💡 Usage</b>

<b>🔧 Admin Commands</b>

• <code>/start</code> – Start the bot
• <code>/link</code> or <code>/sl</code> – Store a single file from a channel post
  <pre>/link https://t.me/c/xxxxx/123</pre>
• <code>/batch</code> or <code>/ml</code> – Store multiple files from a range of messages
  <pre>/batch https://t.me/c/xxxxx/123 https://t.me/c/xxxxx/128</pre>
• <code>/post</code> – Create a movie post directly
  <pre>/post Movie Name https://link</pre>
• <code>/tvpost</code> – Create a series post directly
  <pre>/tvpost Series Name https://link</pre>
• <code>/setchannel</code> or <code>/sc</code> – Set the channel where posts will go
• <code>/setsticker</code> – Set the default sticker/channel
• <code>/token</code> – Toggle token verification for file access
• <code>/filel</code> – Enable or disable file retrieval limit
• <code>/setl</code> – Set file retrieval limit per user
  <pre>/setl @username 10</pre>
• <code>/lstats</code> – View current file limit stats
• <code>/rsl</code> – Reset file limit for a user or all
  <pre>/rsl @username  
/rsl all</pre>
• <code>/broadcast</code> – Broadcast a message to all users
• <code>/stats</code> – View bot statistics
• <code>/help</code> – View available commands

<b>👥 User Commands</b>

• <code>/start</code> – Start the bot and view welcome message
• <code>/start &lt;unique_id&gt;</code> – Retrieve stored files using a unique ID

<b>📝 Commands Reference</b>
<pre>start - Start bot 
link &lt;message_link&gt; - Store single file
batch &lt;startMsgLink&gt; &lt;endMsgLink&gt; - Store multiple file
stats - Check all status.
search - Search file from database
setsticker or ss - Sticker to send after post.
setchannel or sc - Post destination channel
post - Create movie post with proper layout
maddlink - Add link to button in movie post
mlistpost - List you recent movie post
mupdatebtn - Add button to movie post
tvpost - Create series post with proper layout
addlink - Add link to button in series post
listpost - List you recent series post
updatebtn - Add button to series post 
token - Add token verification
filelimit - Enable or Disable user file retrieval limit
setlimit - Set number of file
limitstats - Check retrieval status 
resetlimits - Reset limit all or specific user.
help - Get Help</pre>

<b>📝 File Storage Process</b>

<b>1.</b> Admin sends a channel post link to the bot
<b>2.</b> Bot validates the link and admin permissions
<b>3.</b> Bot generates a unique ID for the file(s)
<b>4.</b> Files are stored in the database with the unique ID
<b>5.</b> Bot returns a shareable link for file retrieval
<b>6.</b> Users can access files using the shareable link

<b>📊 Logging System</b>

The bot includes a comprehensive logging system that tracks:

• Command usage
• User actions
• File storage activities
• Error events

<b>Logs are:</b>
• Saved to daily log files
• Sent to a designated Telegram logging channel
• Formatted for easy reading and monitoring

<b>⚠️ Error Handling</b>

The bot includes robust error handling for:

• Invalid links
• Unauthorized access attempts
• File storage failures
• Database connection issues
• Message processing errors

<b>🤝 Contributing</b>

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

<b>📜 License</b>

This project is licensed under the MIT License – see the LICENSE file for details.

<b>💬 Support</b>

If you encounter any issues or have questions, please:

<b>1.</b> Check the existing issues or create a new one
<b>2.</b> Contact the bot creator through Telegram
<b>3.</b> Submit a pull request with your proposed changes

<b>🙏 Acknowledgments</b>

• <a href="https://github.com/telegraf/telegraf">Telegraf</a> – Telegram Bot Framework
• <a href="https://www.mongodb.com/">MongoDB</a> – Database
• <a href="https://nodejs.org/">Node.js</a> – Runtime Environment

━━━━━━━━━━━━━━━━━━━━

Made with ❤️ by <a href="https://t.me/chihiro_assistant_bot">𝗖𝗵𝗶𝗵𝗶𝗿𝗼 𝗔𝘀𝗵𝗶𝘀𝘂𝘁𝗮𝗻𝘁𝗼</a>