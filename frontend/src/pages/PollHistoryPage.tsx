import { useEffect, useState } from "react";
import axios from "axios";
import PollHistory from "../components/PollHistory";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface Option {
  _id: string;
  text: string;
  isCorrect: boolean;
  count: number;
  percentage: number;
}

interface HistoryItem {
  _id: string;
  question: string;
  options: Option[];
  createdAt: string;
}

const PollHistoryPage = () => {
  const [pollHistory, setPollHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/polls/history`);
        setPollHistory(res.data);
      } catch (err) {
        // Handle error silently
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-white p-6">
      <PollHistory history={pollHistory} />
    </div>
  );
};

export default PollHistoryPage;
