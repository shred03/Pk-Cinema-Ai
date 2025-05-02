const getFileDataFromMessage = (message) => {
    const originalCaption = message.caption || '';
    
    if (message.document) {
        return {
            file_name: message.document.file_name,
            file_id: message.document.file_id,
            file_type: 'document',
            original_caption: originalCaption
        };
    } else if (message.photo) {
        return {
            file_name: 'photo.jpg',
            file_id: message.photo[message.photo.length - 1].file_id,
            file_type: 'photo',
            original_caption: originalCaption
        };
    } else if (message.video) {
        return {
            file_name: message.video.file_name || 'video.mp4',
            file_id: message.video.file_id,
            file_type: 'video',
            original_caption: originalCaption
        };
    } else if (message.animation) {
        return {
            file_name: 'animation.gif',
            file_id: message.animation.file_id,
            file_type: 'animation',
            original_caption: originalCaption
        };
    } else if (message.sticker) {
        return {
            file_name: 'sticker.webp',
            file_id: message.sticker.file_id,
            file_type: 'sticker',
            original_caption: originalCaption
        };
    }
    return null;
};

module.exports = {getFileDataFromMessage};