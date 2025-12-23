// const mongoose = require("mongoose");

// const EpicSchema = new mongoose.Schema(
//     {
//         lastPostedGameSlug: {
//             type: String,
//             required: true
//         }
//     },
//     { timestamps: true }
// );

// const Epic = mongoose.model("Epic", EpicSchema);
// module.exports = Epic;

// updated new model 

const mongoose = require("mongoose");

const EpicSchema = new mongoose.Schema(
    {
        lastPostedGameSlug: {
            type: String,
            required: true
        },
        activeChatIds: {
            type: [String],
            default: []
        },
        deactiveChatIds: {
            type: [String],
            default: []
        }
    },
    { timestamps: true }
);

const Epic = mongoose.model("Epic", EpicSchema);
module.exports = Epic;