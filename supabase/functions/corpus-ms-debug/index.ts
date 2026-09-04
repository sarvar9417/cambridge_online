import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() => Response.json(
  { error: "retired_endpoint", message: "This legacy mark-scheme debug endpoint has been retired." },
  { status: 410, headers: { "Cache-Control": "no-store" } },
));
