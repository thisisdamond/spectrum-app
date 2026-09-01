import { AccessibleText } from "../components/AccessibleText";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";

export function LikesScreen() {
  return <Screen><AccessibleText variant="title" weight="800">Likes you</AccessibleText><Card><AccessibleText>Your incoming likes will appear here. Previewing all likes is a Premium feature.</AccessibleText></Card></Screen>;
}
