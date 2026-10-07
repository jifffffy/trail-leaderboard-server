import RelativeTime from "@/components/RelativeTime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConfig } from "@/lib/config/get-config";
import { getActivities, getAllContributorUsernames } from "@/lib/data/loader";
import { getAvatarSrc } from "@/lib/utils";
import { Database, ExternalLink, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const config = getConfig();

  const [usernames, recentActivities] = await Promise.all([
    getAllContributorUsernames(),
    getActivities({ limit: 20 }),
  ]);

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-10 pb-24 lg:pb-8">
      {/* ========== Hero ========== */}
      <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/5 via-background to-primary/10 border border-border/50 px-4 py-8 sm:px-10 sm:py-14">
        <div className="relative z-10 flex flex-col items-center text-center gap-4 max-w-3xl mx-auto">
          <Image
            src={config.org.logo_url}
            alt={config.org.name}
            width={56}
            height={56}
            className="rounded-xl shadow-md"
          />
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
            {config.org.name}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-xl leading-relaxed">
            {config.org.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full sm:w-auto">
            <Link
              href="/people"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors no-underline"
            >
              <Users className="h-4 w-4" />
              Browse Contributors
            </Link>
            <Link
              href="/data"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors no-underline"
            >
              <Database className="h-4 w-4" />
              Data Explorer
            </Link>
          </div>
        </div>
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* ========== KPI Stats ========== */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 sm:pt-5 sm:pb-4">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Contributors
              </span>
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/60" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight">
              {usernames.length.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 sm:pt-5 sm:pb-4">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recent Activity
              </span>
              <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/60" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight">
              {recentActivities.length.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ========== Recent Activity Feed ========== */}
      <section>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No recent activities
              </p>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {recentActivities.map((a) => (
                  <div
                    key={a.slug}
                    className="flex items-start sm:items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <Link
                      href={`/${a.contributor}`}
                      className="shrink-0 mt-0.5 sm:mt-0"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage
                          src={getAvatarSrc(a.contributor)}
                          alt={a.contributor}
                        />
                        <AvatarFallback className="text-[10px]">
                          {a.contributor.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap overflow-hidden">
                      <Link
                        href={`/${a.contributor}`}
                        className="text-sm font-medium hover:underline shrink-0"
                      >
                        {a.contributor}
                      </Link>
                      {a.title && (
                        <span className="text-xs truncate text-muted-foreground inline-flex items-center gap-1">
                          {a.title}
                          {a.link && (
                            <a
                              href={a.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground/60 hover:text-foreground"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </span>
                      )}
                    </div>
                    {a.points !== null && a.points > 0 && (
                      <span className="text-xs font-medium text-primary shrink-0">
                        +{a.points}
                      </span>
                    )}
                    <RelativeTime
                      date={a.occurred_at}
                      className="text-xs text-muted-foreground/70 shrink-0"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
