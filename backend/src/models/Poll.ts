import mongoose, { Document, Schema, Types } from "mongoose";

export interface IOption {
  _id: Types.ObjectId;
  text: string;
  isCorrect: boolean;
}

export interface IPoll extends Document {
  _id: Types.ObjectId;
  text: string;
  options: Types.DocumentArray<IOption & Document>;
  timeLimit: number;
  createdAt: Date;
}

const optionSchema = new Schema<IOption>({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
});

const pollSchema = new Schema<IPoll>({
  text: { type: String, required: true },
  options: [optionSchema],
  timeLimit: { type: Number, default: 60 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPoll>("Poll", pollSchema);
