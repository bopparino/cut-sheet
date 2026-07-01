import { redirect } from "next/navigation";

// The Replica view is the default editor. Every entry point links to
// /form/[id]; this redirect funnels them to the replica. The Card view lives at
// /form/[id]/card and is reachable from the replica's "Card form" link.
export default async function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/form/${id}/replica`);
}

export const dynamic = "force-dynamic";
