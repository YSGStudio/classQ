import type { Answer, Question, Room, StudentStats } from "@/types";

export const currentStudent = {
  name: "김민준",
  score: 42,
};

export const rooms: Room[] = [
  {
    id: "r-1",
    name: "3학년 1반 과학 탐구",
    subject: "과학",
    code: "AB1234",
    teacherName: "김선생",
    isActive: true,
  },
  {
    id: "r-2",
    name: "4학년 2반 사회 토론",
    subject: "사회",
    code: "CD5678",
    teacherName: "이선생",
    isActive: true,
  },
];

export const questions: Question[] = [
  {
    id: "q-1",
    roomCode: "AB1234",
    author: "김민준",
    content: "왜 하늘은 파란색인가요?",
    createdAt: "5분 전",
    avgRating: 4.3,
    answerCount: 7,
  },
  {
    id: "q-2",
    roomCode: "AB1234",
    author: "이서연",
    content: "물은 왜 투명한가요?",
    createdAt: "12분 전",
    avgRating: 3.8,
    answerCount: 3,
  },
  {
    id: "q-3",
    roomCode: "AB1234",
    author: "박지호",
    content: "식물은 어떻게 자라나요?",
    createdAt: "20분 전",
    avgRating: 0,
    answerCount: 0,
  },
  {
    id: "q-4",
    roomCode: "AB1234",
    author: "최예린",
    content: "무지개는 왜 여러 색으로 보여요?",
    createdAt: "31분 전",
    avgRating: 4.8,
    answerCount: 5,
  },
  {
    id: "q-5",
    roomCode: "AB1234",
    author: "정수민",
    content: "바람은 왜 생기나요?",
    createdAt: "40분 전",
    avgRating: 4.1,
    answerCount: 2,
  },
];

export const answersByQuestion: Record<string, Answer[]> = {
  "q-1": [
    {
      id: "a-1",
      questionId: "q-1",
      author: "이서연",
      content: "햇빛이 공기 중에서 퍼질 때 파란빛이 더 많이 퍼져 보여요.",
      score: 5,
      createdAt: "방금 전",
    },
    {
      id: "a-2",
      questionId: "q-1",
      author: "박지호",
      content: "해가 질 때 빨갛게 보이는 것도 비슷한 이유라고 들었어요.",
      score: 4,
      createdAt: "2분 전",
    },
  ],
  "q-2": [
    {
      id: "a-3",
      questionId: "q-2",
      author: "김민준",
      content: "빛이 물을 지나갈 때 대부분 잘 통과해서 투명하게 보여요.",
      score: 4,
      createdAt: "9분 전",
    },
  ],
};

export const studentStats: StudentStats[] = [
  { name: "김민준", score: 42, questionCount: 3, answerCount: 8 },
  { name: "이서연", score: 38, questionCount: 2, answerCount: 7 },
  { name: "박지호", score: 34, questionCount: 1, answerCount: 6 },
  { name: "최예린", score: 29, questionCount: 4, answerCount: 5 },
];

export const topScoreStudents = studentStats.slice(0, 3);

export const topRatedQuestions = [...questions]
  .sort((a, b) => b.avgRating - a.avgRating)
  .slice(0, 3);

export const topAnsweredQuestions = [...questions]
  .sort((a, b) => b.answerCount - a.answerCount)
  .slice(0, 3);
