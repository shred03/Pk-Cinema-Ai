const mongoose = require('mongoose')

const requestSchema = new mongoose.Schema({
    user_id: Number,   //requested userid
    request_id: String, //generate 10 char id
    requested_by: String, //requested namer of user 
    request_content: String,
    request_originId: String,  //chatId from request was made 
    request_forwardId: String,
    isRequestCompleted: Boolean,
    requestAcceptedBy: Number  //admin id

})

const Request = mongoose.model('Request', requestSchema);
module.exports = Request;