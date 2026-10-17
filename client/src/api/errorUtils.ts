export function getErrorMessage(error: unknown): string {
  if (!error) return "Something went wrong";
  if (typeof error === "object" && error !== null) {
    const err = error as { data?: { message?: string; error?: string }; error?: string; message?: string };
    if (err.data?.message) return err.data.message;
    if (err.data?.error) return err.data.error;
    if (err.error) return err.error;
    if (err.message) return err.message;
  }
  return "Something went wrong";
}
