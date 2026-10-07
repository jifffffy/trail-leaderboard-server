import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarSrc } from "@/lib/utils";
import Link from "next/link";

interface Contributor {
  username: string;
  name: string | null;
  avatar_url: string | null;
  totalPoints: number;
}

interface PeopleViewProps {
  contributors: Contributor[];
  orgName: string;
}

export default function PeopleView({ contributors, orgName }: PeopleViewProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Our People</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Meet the <strong>{contributors.length}</strong> contributors who make{" "}
          {orgName} possible
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
        {contributors.map((contributor) => (
          <Link
            key={contributor.username}
            href={`/${contributor.username}`}
            className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-foreground/20"
          >
            <Avatar className="size-16 transition-transform group-hover:scale-105">
              <AvatarImage
                src={getAvatarSrc(contributor.username)}
                alt={contributor.name || contributor.username}
                className="object-cover"
              />
              <AvatarFallback>
                {(contributor.name || contributor.username)
                  .substring(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center min-w-0 w-full">
              <p className="font-medium truncate text-sm group-hover:text-foreground transition-colors">
                {contributor.name || contributor.username}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{contributor.username}
              </p>
              {contributor.totalPoints > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {contributor.totalPoints.toLocaleString()} pts
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Showing {contributors.length} contributors</p>
      </div>
    </div>
  );
}
