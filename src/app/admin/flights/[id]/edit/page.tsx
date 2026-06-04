import { notFound } from "next/navigation";
import { EditFlightClient } from "./EditFlightClient";

export const dynamic = "force-dynamic";

export default async function EditFlightPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  return <EditFlightClient flightId={id} />;
}
