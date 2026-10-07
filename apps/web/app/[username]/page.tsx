import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConfig } from "@/lib/config/get-config";
import {
  getAllContributorUsernames,
  getContributorProfile,
} from "@/lib/data/loader";
import { getAvatarSrc } from "@/lib/utils";
import {
  Activity as ActivityIcon,
  Award,
  Calendar,
  LucideIcon,
} from "lucide-react";
import { marked } from "marked";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface ContributorPageProps {
  params: Promise<{ username: string }>;
}

export async function generateStaticParams() {
  const usernames = await getAllContributorUsernames();
  return usernames.map((username) => ({ username }));
}

export async function generateMetadata({
  params,
}: ContributorPageProps): Promise<Metadata> {
  const { username } = await params;
  const { contributor, activities } = await getContributorProfile(username);
  const config = getConfig();

  if (!contributor) {
    return { title: "Contributor Not Found" };
  }

  const title = `${contributor.name || contributor.username} - ${config.org.name}`;
  const description =
    contributor.bio ||
    `${contributor.name || contributor.username} has ${activities.length} recorded activities on ${config.org.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: config.meta.title,
      type: "profile",
      images: [config.meta.image_url],
    },
  };
}

const BUILTIN_CONTRIBUTOR_AGGREGATES: Record<
  string,
  { name: string; description: string; icon: LucideIcon }
> = {
  total_points: {
    name: "Total Points",
    description: "All time",
    icon: Award,
  },
  total_activities: {
    name: "Total Activities",
    description: "All time",
    icon: ActivityIcon,
  },
  activity_types: {
    name: "Activity Types",
    description: "Different types",
    icon: Calendar,
  },
};

export default async function ContributorPage({
  params,
}: ContributorPageProps) {
  const { username } = await params;

  const { contributor, activities, totalPoints } =
    await getContributorProfile(username);

  if (!contributor) {
    notFound();
  }

  const activityBreakdown = activities.reduce<Record<string, number>>(
    (acc, activity) => {
      const key = activity.activity_name;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const aggregateCards = [
    {
      ...BUILTIN_CONTRIBUTOR_AGGREGATES.total_points!,
      value: `${totalPoints}`,
    },
    {
      ...BUILTIN_CONTRIBUTOR_AGGREGATES.total_activities!,
      value: `${activities.length}`,
    },
    {
      ...BUILTIN_CONTRIBUTOR_AGGREGATES.activity_types!,
      value: `${Object.keys(activityBreakdown).length}`,
    },
  ];

  const bioHtml = contributor.bio ? await marked.parse(contributor.bio) : null;

  return (
    <div className="container mx-auto px-4 sm:py-8">
      {/* Profile Header */}
      <div className="mb-8 flex flex-col md:flex-row gap-6 items-start">
        <Avatar className="size-20 sm:size-32 shrink-0">
          <AvatarImage
            src={getAvatarSrc(contributor.username)}
            alt={contributor.name || contributor.username}
          />
          <AvatarFallback className="text-2xl sm:text-4xl">
            {(contributor.name || contributor.username)
              .substring(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 wrap-break-word">
            {contributor.name || contributor.username}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-4 truncate">
            @{contributor.username}
          </p>
          {bioHtml && (
            <div
              className="text-muted-foreground mb-4 prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: bioHtml }}
            />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {aggregateCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.name}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No activity recorded yet
            </p>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {activities.slice(0, 50).map((a) => (
                <div
                  key={a.slug}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-xs text-muted-foreground/70 shrink-0">
                    {new Date(a.occurred_at).toLocaleDateString()}
                  </span>
                  <span className="text-sm flex-1 min-w-0 truncate">
                    {a.title || a.activity_name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {a.activity_name}
                  </span>
                  {a.points !== null && a.points > 0 && (
                    <span className="text-xs font-medium text-primary shrink-0">
                      +{a.points}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <Link
          href="/people"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to People
        </Link>
      </div>
    </div>
  );
}
