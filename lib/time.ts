export function toRelativeKorean(isoDate: string): string {
  const now = Date.now();
  const target = new Date(isoDate).getTime();
  const seconds = Math.max(0, Math.floor((now - target) / 1000));

  if (seconds < 60) return "방금 전";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  return new Date(isoDate).toLocaleDateString("ko-KR");
}
