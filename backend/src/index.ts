import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import socketHandler, { AppServer } from "./socket.js";
import Poll from "./models/Poll.js";
import ResponseModel from "./models/Response.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io: AppServer = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB error:", err));

io.on("connection", (socket) => {
  socketHandler(socket, io);
});

app.get("/", (_req: Request, res: Response) => {
  res.send("Polling server is running!");
});

app.get("/api/polls/history", async (_req: Request, res: Response) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 });
    const responses = await ResponseModel.find();

    const history = polls.map((poll) => {
      const pollResponses = responses.filter(
        (r) => r.pollId?.toString() === poll._id.toString(),
      );

      const optionCounts = poll.options.map((option) => {
        const count = pollResponses.filter(
          (r) =>
            r.selectedOption &&
            r.selectedOption.toString() === option._id.toString(),
        ).length;

        return {
          _id: option._id,
          text: option.text,
          isCorrect: option.isCorrect,
          count,
        };
      });

      const totalVotes = optionCounts.reduce((acc, opt) => acc + opt.count, 0);

      return {
        _id: poll._id,
        question: poll.text,
        options: optionCounts.map((opt) => ({
          ...opt,
          percentage: totalVotes
            ? Math.round((opt.count / totalVotes) * 100)
            : 0,
        })),
        createdAt: poll.createdAt,
      };
    });

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch poll history" });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
