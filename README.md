Here’s the updated `README.md` content with your full **Admin Commands** list properly merged into the "Usage 💡" section and polished for consistency:

---

# Advanced Telegram File Store Bot 📁

An advanced & powerful Telegram bot that allows storing files from channels and generating shareable links for easy file retrieval. Perfect for creating organized file archives and sharing content efficiently.

## Features 🌟

* **Single File Storage**: Store individual files from channel posts
* **Batch File Storage**: Store multiple files from a range of messages
* **Custom Captions**: Set and manage custom captions for shared files
* **Multiple File Types Support**:

  * Documents 📄
  * Photos 🖼️
  * Videos 🎥
  * Animations (GIFs) 🎭
  * Stickers 🎯
* **Admin Management**: Secure admin-only storage capabilities
* **Logging System**: Comprehensive logging of all bot activities
* **User-Friendly Interface**: Interactive buttons and clear instructions

## Prerequisites 📋

Before setting up the bot, make sure you have:

* Node.js (v14 or higher)
* MongoDB database
* Telegram Bot Token (from [@BotFather](https://t.me/botfather))
* A Telegram channel where the bot is an admin

## Installation 🚀

1. Clone the repository:

```bash
git clone https://github.com/shred03/Pk-Cinema-Ai
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```env
BOT_TOKEN=bot-token
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
```

4. Start the bot:

```bash
npm run start
```

## Usage 💡

### Admin Commands

* `/start` – Start the bot
* `/link` or `/sl` – Store a single file from a channel post

  ```
  /link https://t.me/c/xxxxx/123
  ```
* `/batch` or `/ml` – Store multiple files from a range of messages

  ```
  /batch https://t.me/c/xxxxx/123 https://t.me/c/xxxxx/128
  ```
* `/post` – Create a movie post directly

  ```
  /post Movie Name https://link
  ```
* `/tvpost` – Create a series post directly

  ```
  /tvpost Series Name https://link
  ```
* `/setchannel` or `/sc` – Set the channel where posts will go
* `/setsticker` – Set the default sticker/channel
* `/token` – Toggle token verification for file access
* `/filel` – Enable or disable file retrieval limit
* `/setl` – Set file retrieval limit per user

  ```
  /setl @username 10
  ```
* `/lstats` – View current file limit stats
* `/rsl` – Reset file limit for a user or all

  ```
  /rsl @username  
  /rsl all
  ```
* `/broadcast` – Broadcast a message to all users
* `/stats` – View bot statistics
* `/help` – View available commands

### User Commands

* `/start` – Start the bot and view welcome message
* `/start <unique_id>` – Retrieve stored files using a unique ID

### Commands List
```
start - Start the bot
link - or /sl Store file from message link
batch - or /ml Store files from message range
stats - View bot statistics
broadcast - Broadcast a message to all users
post - Create a movie post directly
setchannel - or /sc Set the channel where posts will go
tvpost - Create a series post directly
setsticker - Set the default sticker/channel
token - Toggle token verification for file access
filel - Enable or disable file retrieval limit
setl - Set file retrieval limit per user
lstats - View current file limit stats
rsl - Reset file limit for a user or all
help - View commands
```

## File Storage Process 📝

1. Admin sends a channel post link to the bot
2. Bot validates the link and admin permissions
3. Bot generates a unique ID for the file(s)
4. Files are stored in the database with the unique ID
5. Bot returns a shareable link for file retrieval
6. Users can access files using the shareable link

## Logging System 📊

The bot includes a comprehensive logging system that tracks:

* Command usage
* User actions
* File storage activities
* Error events

Logs are:

* Saved to daily log files
* Sent to a designated Telegram logging channel
* Formatted for easy reading and monitoring

## Error Handling ⚠️

The bot includes robust error handling for:

* Invalid links
* Unauthorized access attempts
* File storage failures
* Database connection issues
* Message processing errors

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License 📜

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

## Support 💬

If you encounter any issues or have questions, please:

1. Check the existing issues or create a new one
2. Contact the bot creator through Telegram
3. Submit a pull request with your proposed changes

## Acknowledgments 🙏

* [Telegraf](https://github.com/telegraf/telegraf) – Telegram Bot Framework
* [MongoDB](https://www.mongodb.com/) – Database
* [Node.js](https://nodejs.org/) – Runtime Environment

---

Made with ❤️ by [𝗖𝗵𝗶𝗵𝗶𝗿𝗼 𝗔𝘀𝗵𝗶𝘀𝘂𝘁𝗮𝗻𝘁𝗼](https://t.me/chihiro_assistant_bot)

---
