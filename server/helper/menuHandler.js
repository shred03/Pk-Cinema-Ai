const userCurrentMenu = new Map();

/**
 * Enhanced menu action handler that prevents duplicate API calls
 * @param {Object} ctx - Telegram context object
 * @param {string} action - Menu action (home, join_channels, about, commands)
 * @param {Object} descriptions - Descriptions object containing menu content
 * @param {Object} mainKeyboard - Main keyboard markup
 */
const handleMenuAction = async (ctx, action, descriptions, mainKeyboard) => {
    const userId = ctx.from.id;
    
    // Check if user is already on this menu
    if (userCurrentMenu.get(userId) === action) {
        const buttonNames = {
            'home': '🏠 Home',
            'join_channels': '📌Join Channels', 
            'about': 'ℹ️ About',
            'commands': '📋 Commands'
        };
        
        await ctx.answerCbQuery(`Already on ${buttonNames[action]}`, { show_alert: false });
        return;
    }
    
    try {
        const caption = action === 'home'
            ? `Hello ${ctx.from.first_name}\n\n${descriptions[action]}`
            : descriptions[action];

        await ctx.editMessageCaption(caption, {
            parse_mode: 'Markdown',
            ...mainKeyboard
        });
        
        // Update user's current menu state
        userCurrentMenu.set(userId, action);
        await ctx.answerCbQuery();
        
    } catch (error) {
        if (error.message.includes('message is not modified')) {
            const buttonNames = {
                'home': '🏠 Home',
                'join_channels': '📌Join Channels',
                'about': 'ℹ️ About', 
                'commands': '📋 Commands'
            };
            await ctx.answerCbQuery(`Already on ${buttonNames[action]}`, { show_alert: false });
        } else {
            console.error(`Error handling ${action} button:`, error);
            await ctx.answerCbQuery('Something went wrong. Please try again.', { show_alert: false });
        }
    }
};

/**
 * Set user's initial menu state (usually called on /start)
 * @param {number} userId - User ID
 * @param {string} initialState - Initial menu state (default: 'home')
 */
const setInitialMenuState = (userId, initialState = 'home') => {
    userCurrentMenu.set(userId, initialState);
};

/**
 * Get user's current menu state
 * @param {number} userId - User ID
 * @returns {string|undefined} Current menu state
 */
const getCurrentMenuState = (userId) => {
    return userCurrentMenu.get(userId);
};

/**
 * Clear user's menu state
 * @param {number} userId - User ID
 */
const clearMenuState = (userId) => {
    userCurrentMenu.delete(userId);
};

module.exports = {
    handleMenuAction,
    setInitialMenuState,
    getCurrentMenuState,
    clearMenuState
};