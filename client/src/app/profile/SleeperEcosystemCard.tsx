import type { ProfileSleeperDTO } from "@/types/api/profile";
import { profileStyles as s } from "./styles";

interface Props {
  sleeper: ProfileSleeperDTO;
  activeLeagueCount: number;
}

export const SleeperEcosystemCard = ({ sleeper, activeLeagueCount }: Props) => (
  <section className={s.card}>
    <div className="flex items-center mb-1">
      <span className="w-3 h-3 rounded-full mr-2 bg-purple-600" />
      <h3 className="text-lg font-bold text-primary dark:text-foreground">
        Connected Sleeper Ecosystem
      </h3>
    </div>
    <p className={s.description}>
      Read-only summary. Manage connections on the Connect Platforms page.
    </p>

    {sleeper.connected ? (
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-border rounded-md p-4">
          <dt className="text-xs uppercase tracking-wider opacity-50">
            Sleeper username
          </dt>
          <dd className="text-xl font-bold mt-1">{sleeper.username}</dd>
        </div>
        <div className="border border-border rounded-md p-4">
          <dt className="text-xs uppercase tracking-wider opacity-50">
            Total synced leagues
          </dt>
          <dd className="text-xl font-bold mt-1">{activeLeagueCount}</dd>
        </div>
      </dl>
    ) : (
      <p className="text-sm opacity-70">No Sleeper account connected yet.</p>
    )}
  </section>
);
