import { motor } from "@/lib/engine";
import { json, erro } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await motor.base());
  } catch (e) {
    return erro(e);
  }
}
