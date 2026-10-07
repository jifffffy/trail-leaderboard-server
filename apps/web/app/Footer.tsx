import RelativeTime from "@/components/RelativeTime";
import type { Config } from "@/lib/config/schema";
import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue";
import { Calendar, Clock, MapIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const pageLinks = [
  { name: "Home", href: "/" },
  { name: "People", href: "/people" },
  { name: "Data Explorer", href: "/data" },
];

function getCronDescription(cronExpression: string): string | null {
  try {
    return cronstrue.toString(cronExpression, { use24HourTimeFormat: false });
  } catch {
    return null;
  }
}

function getNextUpdateTime(cronExpression: string): string | null {
  try {
    const expr = CronExpressionParser.parse(cronExpression);
    return expr.next().toISOString();
  } catch {
    return null;
  }
}

function getBuildTimestamp(): string | null {
  const timestamp = process.env.NEXT_PUBLIC_BUILD_TIMESTAMP;
  if (!timestamp) return null;
  try {
    // Validate it's a parseable date
    new Date(timestamp).toISOString();
    return timestamp;
  } catch {
    return null;
  }
}

interface FooterProps {
  config: Config;
}

export default function Footer({ config }: FooterProps) {
  const { org, leaderboard } = config;

  const buildTimestamp = getBuildTimestamp();
  const cronDescription = leaderboard.data_update_frequency
    ? getCronDescription(leaderboard.data_update_frequency)
    : null;
  const nextUpdateTime = leaderboard.data_update_frequency
    ? getNextUpdateTime(leaderboard.data_update_frequency)
    : null;

  const showDataExplorer = leaderboard.data_explorer?.enabled !== false;

  const allPageLinks = showDataExplorer
    ? pageLinks
    : pageLinks.filter((l) => l.href !== "/data");

  return (
    <footer className="border-t mt-16 pb-10 lg:pb-0">
      <div className="container mx-auto px-6 py-12 lg:py-16">
        {/* Top: Org identity + Link columns */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Org Identity */}
          <div className="lg:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <Image
                src={org.logo_url}
                alt={org.name}
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {org.name}
              </span>
            </Link>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              {org.description}
            </p>

            {org.start_date && (
              <p className="text-sm text-muted-foreground/80 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Building since <RelativeTime date={org.start_date} />
                </span>
              </p>
            )}
          </div>

          {/* Pages column */}
          <div className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Pages
            </h3>
            <ul className="space-y-2">
              {allPageLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Status column */}
          <div className="lg:col-span-4 space-y-6">
            {buildTimestamp && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Status
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Updated <RelativeTime date={buildTimestamp} />
                      {cronDescription && (
                        <p className="text-xs text-muted-foreground/50">
                          updates {cronDescription.toLowerCase()}
                        </p>
                      )}
                      {nextUpdateTime && (
                        <p className="text-xs text-muted-foreground/50">
                          next update <RelativeTime date={nextUpdateTime} />
                        </p>
                      )}
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t mt-10 pt-6">
          <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
            <p className="text-center sm:text-left" suppressHydrationWarning>
              &copy; {new Date().getFullYear()} {org.name}. All rights reserved.
            </p>
            <Link
              href="/sitemap.xml"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1.5"
            >
              <MapIcon className="h-3.5 w-3.5" />
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
