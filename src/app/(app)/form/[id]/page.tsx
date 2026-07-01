import { redirect } from "next/navigation";

// The Replica view is the sole editor. Every entry point links to /form/[id];
// this redirect funnels them to the replica. (The Card view is disabled -
// /form/[id]/card also redirects here.)
export default async function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/form/${id}/replica`);
}

export const dynamic = "force-dynamic";
