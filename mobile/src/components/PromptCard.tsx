import { Card } from "./Card";
import { AccessibleText } from "./AccessibleText";
import { colors } from "../theme/colors";

export function PromptCard({ question, answer }: { question: string; answer: string }) {
  return (
    <Card accessibilityLabel={`${question} ${answer}`}>
      <AccessibleText variant="caption" color={colors.muted} weight="700">{question.toUpperCase()}</AccessibleText>
      <AccessibleText variant="bodyLarge">{answer}</AccessibleText>
    </Card>
  );
}
