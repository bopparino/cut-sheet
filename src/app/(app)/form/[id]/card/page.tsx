import { redirect } from "next/navigation";

// The Card view is disabled — the Replica is the sole editor. This redirect
// keeps any old bookmarks/links working by sending them to the replica. The
// previous dense card editor lives in git history if it's ever revived.
export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/form/${id}/replica`);
}

export const dynamic = "force-dynamic";
