import { getErrorMessage } from "../api/errorUtils";

interface Props {
  error: unknown;
}

export default function ErrorBanner({ error }: Props) {
  if (!error) return null;
  return <div className="error-banner">{getErrorMessage(error)}</div>;
}
