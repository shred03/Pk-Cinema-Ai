<h1>🔥 Advanced Telegram File Store Bot 📁</h1>

An advanced &amp; powerful Telegram bot that allows storing files from channels and generating shareable links for easy file retrieval. Perfect for creating organized file archives and sharing content efficiently.

<h2>🌟 Features</h2>

• <b>Single File Storage</b>: Store individual files from channel posts<br>
• <b>Batch File Storage</b>: Store multiple files from a range of messages<br>  
• <b>Custom Captions</b>: Set and manage custom captions for shared files<br>
• <b>Multiple File Types Support</b>:<br>
  ◦ Documents 📄<br>
  ◦ Photos 🖼️<br>
  ◦ Videos 🎥<br>
  ◦ Animations (GIFs) 🎭<br>
  ◦ Stickers 🎯<br>
• <b>Admin Management</b>: Secure admin-only storage capabilities<br>
• <b>Logging System</b>: Comprehensive logging of all bot activities<br>
• <b>User-Friendly Interface</b>: Interactive buttons and clear instructions<br>

<h2>📋 Prerequisites</h2>

Before setting up the bot, make sure you have:

• Node.js (v14 or higher)<br>
• MongoDB database<br>
• Telegram Bot Token (from <a href="https://t.me/botfather">@BotFather</a>)<br>
• A Telegram channel where the bot is an admin<br>

<h2>🚀 Installation</h2>

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

<h2>👥 User Commands</h2>

• <code>/start</code> – Start the bot and view welcome message<br>
• <code>/start &lt;unique_id&gt;</code> – Retrieve stored files using a unique ID<br>

<h2>📝 Bot Commands</h2>
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

<h2>🤝 Contributing</h2>

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

<h3>📜 License</h3>

This project is licensed under the MIT License – see the LICENSE file for details.

<b>💬 Support</b>

If you encounter any issues or have questions, please:

<b>1.</b> Check the existing issues or create a new one<br>
<b>2.</b> Contact the bot creator through Telegram<br>
<b>3.</b> Submit a pull request with your proposed changes<br>

<h2>🙏 Acknowledgments</h2>

• <a href="https://github.com/telegraf/telegraf">Telegraf</a> – Telegram Bot Framework<br>
• <a href="https://www.mongodb.com/">MongoDB</a> – Database<br>
• <a href="https://nodejs.org/">Node.js</a> – Runtime Environment<br>

━━━━━━━━━━━━━━━━━━━━

Made with ❤️ by <a href="https://t.me/chihiro_assistant_bot">𝗖𝗵𝗶𝗵𝗶𝗿𝗼 𝗔𝘀𝗵𝗶𝘀𝘂𝘁𝗮𝗻𝘁𝗼</a>