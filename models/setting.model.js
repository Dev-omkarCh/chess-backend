import mongoose from "mongoose";

const settingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    whiteTile: {
        type: String,
        default: "#F0D9B5",
    },
    blackTile: {
        type: String,
        default: "#B58863",
    },
    pieceStyle: {
        type: String,
        default: "standard"
    },
    preset: {
        type: String,
        default: "standard"
    },
    sound: {
        type: Boolean,
        default: true
    }

});
const Setting = mongoose.model("Setting", settingSchema);
export default Setting;