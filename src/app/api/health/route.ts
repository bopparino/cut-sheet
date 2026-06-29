// Cheap healthcheck - intentionally does not touch the DB so a slow query
// can't take the service down via cascading restarts. Railway's healthcheck
// just needs to know the Node process is up and responding.
export async function GET() {
  return Response.json({ status: "ok" });
}
