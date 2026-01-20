import mongoose, { Document, Schema } from "mongoose";

export interface IMessage extends Document {
    sender: string;
    text: string;
    socketId: string;
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        sender: { type: String },
        text: { type: String },
        socketId: { type: String },
    },
    { timestamps: true }
);

export default mongoose.model<IMessage>("Message", messageSchema);
