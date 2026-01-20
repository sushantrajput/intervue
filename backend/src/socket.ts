import { Server, Socket } from "socket.io";
import Poll from "./models/Poll.js";
import Student from "./models/Student.js";
import Response from "./models/Response.js";
import Message from "./models/Message.js";

interface SocketData {
  name?: string;
}

interface RegisterStudentData {
  name: string;
}

interface ChatMessageData {
  sender: string;
  text: string;
}

interface CreatePollData {
  text: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  timeLimit: number;
}

interface SubmitAnswerData {
  questionId: string;
  answer: string;
}

interface KickStudentData {
  name: string;
}

interface ClientToServerEvents {
  "register-student": (data: RegisterStudentData) => void;
  "request-participants": () => void;
  "chat:message": (data: ChatMessageData) => void;
  "get-all-messages": () => void;
  "create-poll": (data: CreatePollData) => void;
  "submit-answer": (data: SubmitAnswerData) => void;
  "get-poll-history": () => void;
  "kick-student": (data: KickStudentData) => void;
  disconnect: () => void;
}

interface ServerToClientEvents {
  "registration:success": () => void;
  "participants:update": (participants: string[]) => void;
  "chat:message": (msg: {
    sender: string;
    text: string;
    createdAt: Date;
  }) => void;
  "chat:messages": (messages: unknown[]) => void;
  "poll-started": (poll: unknown) => void;
  "poll-error": (error: { message: string; error: string }) => void;
  "poll-results": (result: { answers: Record<string, number> }) => void;
  "poll-history": (history: unknown[]) => void;
  kicked: () => void;
}

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, unknown>,
  SocketData
>;
export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, unknown>,
  SocketData
>;

async function getUpdatedList(): Promise<string[]> {
  const students = await Student.find({ isKicked: false });
  return students.map((s) => s.name);
}

export default function socketHandler(socket: AppSocket, io: AppServer): void {
  socket.on("register-student", async ({ name }: RegisterStudentData) => {
    socket.data.name = name;

    await Student.updateOne(
      { socketId: socket.id },
      { $set: { name, isKicked: false } },
      { upsert: true },
    );

    const students = await Student.find({ isKicked: false });
    const participantNames = students.map((s) => s.name);

    socket.emit("registration:success");
    io.emit("participants:update", participantNames);
  });

  socket.on("request-participants", async () => {
    const students = await Student.find({ isKicked: false });
    const participantNames = students.map((s) => s.name);
    socket.emit("participants:update", participantNames);
  });

  socket.on("chat:message", async ({ sender, text }: ChatMessageData) => {
    if (sender != "Teacher") {
      const student = await Student.findOne({ name: sender });

      if (!student || student.isKicked) return;
    }

    const newMsg = await Message.create({
      sender,
      text,
      socketId: socket.id,
    });

    io.emit("chat:message", {
      sender: newMsg.sender,
      text: newMsg.text,
      createdAt: newMsg.createdAt,
    });
  });

  socket.on("get-all-messages", async () => {
    const allMessages = await Message.find({}).sort({ createdAt: 1 });
    socket.emit("chat:messages", allMessages);
  });

  socket.on(
    "create-poll",
    async ({ text, options, timeLimit }: CreatePollData) => {
      try {
        const poll = await Poll.create({ text, options, timeLimit });
        io.emit("poll-started", poll);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        socket.emit("poll-error", {
          message: "Failed to create poll",
          error: errorMessage,
        });
      }
    },
  );

  async function checkCanAskNew(): Promise<boolean> {
    const activePoll = await Poll.findOne().sort({ createdAt: -1 });
    if (!activePoll) return true;

    const responses = await Response.find({ pollId: activePoll._id });
    const totalStudents = await Student.countDocuments({ isKicked: false });

    return responses.length >= totalStudents;
  }

  socket.on(
    "submit-answer",
    async ({ questionId, answer }: SubmitAnswerData) => {
      const student = await Student.findOne({ socketId: socket.id });
      if (!student) return;

      const poll = await Poll.findById(questionId);
      if (!poll) return;

      const option = poll.options.id(answer);
      const isCorrect = option?.isCorrect || false;

      await Response.create({
        studentId: student._id,
        pollId: questionId,
        selectedOption: answer,
        isCorrect,
      });

      const responses = await Response.find({ pollId: questionId });

      const result: { answers: Record<string, number> } = { answers: {} };
      for (const opt of poll.options) {
        result.answers[opt._id.toString()] = 0;
      }

      for (const res of responses) {
        const id = res.selectedOption?.toString();
        if (id && result.answers[id] !== undefined) {
          result.answers[id] += 1;
        }
      }

      await checkCanAskNew();

      io.emit("poll-results", result);
    },
  );

  socket.on("get-poll-history", async () => {
    const polls = await Poll.find({}).sort({ createdAt: -1 }).limit(10);
    const allResults: Array<{
      poll: (typeof polls)[0];
      results: Record<string, number>;
    }> = [];

    for (const poll of polls) {
      const responses = await Response.find({ pollId: poll._id });
      const result: Record<string, number> = {};

      for (const opt of poll.options) {
        result[opt._id.toString()] = 0;
      }

      for (const res of responses) {
        const id = res.selectedOption?.toString();
        if (id && result[id] !== undefined) {
          result[id] += 1;
        }
      }

      allResults.push({
        poll,
        results: result,
      });
    }

    socket.emit("poll-history", allResults);
  });

  socket.on("kick-student", async ({ name }: KickStudentData) => {
    const student = await Student.findOneAndUpdate(
      { name },
      { $set: { isKicked: true } },
    );

    if (!student) return;

    const targetSocket = [...io.sockets.sockets.values()].find(
      (s) => s.data?.name === name,
    );

    if (targetSocket) {
      targetSocket.emit("kicked");
      targetSocket.disconnect();
    }

    const updatedList = await getUpdatedList();
    io.emit("participants:update", updatedList);
  });

  socket.on("disconnect", async () => {
    await Student.deleteOne({ socketId: socket.id });
    const updatedList = await getUpdatedList();
    io.emit("participants:update", updatedList);
  });
}
