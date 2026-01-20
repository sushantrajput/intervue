import mongoose, { Document, Schema, Model } from "mongoose";

export interface IStudent {
    name: string;
    socketId: string;
    isKicked: boolean;
    joinedAt: Date;
}

export interface IStudentDocument extends IStudent, Document {}

const studentSchema = new Schema<IStudentDocument>({
    name: {
        type: String,
        required: true,
        trim: true
    },
    socketId: {
        type: String,
        required: true,
        unique: true
    },
    isKicked: {
        type: Boolean,
        default: false
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
});

const Student: Model<IStudentDocument> = mongoose.model<IStudentDocument>("Student", studentSchema);

export default Student;
