import mongoose, { Document, Schema, Types } from "mongoose";

export interface IResponse extends Document {
    studentId: Types.ObjectId;
    pollId: Types.ObjectId;
    selectedOption: Types.ObjectId;
    isCorrect: boolean;
    submittedAt: Date;
}

const responseSchema = new Schema<IResponse>({
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    pollId: { type: Schema.Types.ObjectId, ref: "Poll", required: true },
    selectedOption: { type: Schema.Types.ObjectId, required: true },
    isCorrect: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IResponse>("Response", responseSchema);
