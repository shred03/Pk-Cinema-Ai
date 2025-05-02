const extractMessageInfo = (link) => {
    try {
        const url = new URL(link);
        const pathParts = url.pathname.split('/').filter(p => p !== '');
        
        // Handle numeric channel IDs (e.g., https://t.me/c/1234567890/123)
        if (pathParts[0] === 'c' && pathParts.length >= 3) {
            const channelId = `-100${pathParts[1]}`;
            const messageId = parseInt(pathParts[2]);
            return { channelId, messageId };
        }
        // Handle username-based links (e.g., https://t.me/my_channel/123)
        else if (pathParts.length >= 2) {
            const username = pathParts[0];
            const messageId = parseInt(pathParts[1]);
            return { username, messageId };
        }
        return null;
    } catch (error) {
        return null;
    }
};

module.exports = {extractMessageInfo}
