import { prisma } from "@/lib/db";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type QuizProgressPayload = {
  attemptId: string;
  answers: Array<{ questionId: string; value: number }>;
  currentQuestionIndex: number;
};

export async function saveQuizProgress(
  userId: string,
  input: {
    attemptId?: string | null;
    answers: Array<{ questionId: string; value: number }>;
    currentQuestionIndex: number;
  },
): Promise<{ attemptId: string }> {
  const cutoff = new Date(Date.now() - WINDOW_MS);

  let attempt =
    input.attemptId != null && input.attemptId !== ""
      ? await prisma.quizAttempt.findFirst({
          where: {
            id: input.attemptId,
            userId,
            status: "in_progress",
            startedAt: { gte: cutoff },
          },
        })
      : null;

  if (!attempt) {
    await prisma.quizAttempt.updateMany({
      where: { userId, status: "in_progress" },
      data: { status: "abandoned" },
    });
    attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        status: "in_progress",
        currentQuestionIndex: input.currentQuestionIndex,
      },
    });
  }

  await prisma.quizAnswer.deleteMany({ where: { attemptId: attempt.id } });
  if (input.answers.length > 0) {
    await prisma.quizAnswer.createMany({
      data: input.answers.map((a) => ({
        attemptId: attempt.id,
        questionId: a.questionId,
        value: a.value,
      })),
    });
  }

  await prisma.quizAttempt.update({
    where: { id: attempt.id },
    data: { currentQuestionIndex: input.currentQuestionIndex },
  });

  return { attemptId: attempt.id };
}

export async function getQuizProgress(userId: string): Promise<QuizProgressPayload | null> {
  const cutoff = new Date(Date.now() - WINDOW_MS);
  const attempt = await prisma.quizAttempt.findFirst({
    where: {
      userId,
      status: "in_progress",
      startedAt: { gte: cutoff },
    },
    orderBy: { updatedAt: "desc" },
    include: { answers: true },
  });

  if (!attempt || attempt.answers.length === 0) {
    return null;
  }

  return {
    attemptId: attempt.id,
    answers: attempt.answers.map((a) => ({
      questionId: a.questionId,
      value: a.value,
    })),
    currentQuestionIndex: attempt.currentQuestionIndex,
  };
}

export async function abandonQuizProgress(userId: string) {
  await prisma.quizAttempt.updateMany({
    where: { userId, status: "in_progress" },
    data: { status: "abandoned" },
  });
}
