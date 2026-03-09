/** Ambient types for Deno (Supabase Edge Functions). Stops IDE from reporting "Cannot find name 'Deno'". */
declare namespace Deno {
  function serve(handler: (req: Request) => Promise<Response> | Response): void;
  const env: {
    get(key: string): string | undefined;
  };
}
