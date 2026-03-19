export type UserRole = "teacher" | "student";

export type Profile = {
  id: string;
  role: UserRole;
  name: string;
  score?: number;
};

export type Room = {
  id: string;
  name: string;
  subject: string;
  code: string;
  teacherName: string;
  isActive?: boolean;
};

export type Question = {
  id: string;
  roomCode: string;
  roomId?: string;
  authorId?: string;
  author: string;
  content: string;
  createdAt: string;
  avgRating: number;
  ratingTotal?: number;
  ratingCount?: number;
  hasRated?: boolean;
  myRating?: number | null;
  answerCount: number;
};

export type Answer = {
  id: string;
  questionId: string;
  author: string;
  content: string;
  score?: number;
  createdAt: string;
};

export type StudentStats = {
  name: string;
  score: number;
  questionCount: number;
  answerCount: number;
};
