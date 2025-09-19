import LeaderboardClient from './LeaderboardClient';

export const metadata = {
  title: 'Leaderboard | Cricket Bowling Speed Meter',
  description: 'See the top recorded bowling speeds and similarity scores ranked in real time.'
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
