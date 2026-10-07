import { getOrganizersJson } from "@/lib/data/race-api";

export const dynamic = "force-static";

export async function GET() {
  const organizers = await getOrganizersJson();

  return Response.json(
    {
      generated_at: new Date().toISOString(),
      count: organizers.length,
      organizers,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
