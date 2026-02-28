import RoomFeedClient from "@/components/RoomFeedClient";
import { getRoomFeedData } from "@/lib/classq-data";

export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const feed = await getRoomFeedData(code);

  return (
    <RoomFeedClient
      code={code}
      room={feed.room}
      initialQuestions={feed.questions}
      current={feed.current}
      scoreTop3={feed.scoreTop3}
      ratedTop3={feed.ratedTop3}
      answeredTop3={feed.answeredTop3}
    />
  );
}
