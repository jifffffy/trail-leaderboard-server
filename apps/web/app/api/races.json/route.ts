import { getRacesJson } from "@/lib/data/race-api";

export const dynamic = "force-static";

export async function GET() {
  const races = await getRacesJson();

  return Response.json(
    {
      generated_at: new Date().toISOString(),
      count: races.length,
      races,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
