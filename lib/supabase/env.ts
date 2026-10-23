// Public values: safe to ship to the browser. Row level security protects the data.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://gprfqtssqbeyixflknhn.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_gL4MxiqvgHY02DzXPh_PwA_caL8XBVm";

export function publicUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
