interface Props {
  text: string;
}

export default function DisclaimerBanner({ text }: Props) {
  return <div className="disclaimer-banner">⚠️ {text}</div>;
}
