export type QuestResponseType = "photo" | "text" | "photo_text";
export type QuestRewardKind = "FRAGMENT" | "ASTEROID" | "FLOWER" | "NEBULA" | "SPECIAL_STAR";

export type QuestTemplate = {
  key: string;
  title: string;
  instructions: string;
  responseType: QuestResponseType;
  rewardKind: QuestRewardKind;
};

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    key: "photograph_sky",
    title: "Photograph the sky",
    instructions: "Step outside or to a window and capture the sky where you are.",
    responseType: "photo",
    rewardKind: "FRAGMENT",
  },
  {
    key: "favorite_song",
    title: "Share today's favorite song",
    instructions: "Name the song that stuck with you today, and why in a sentence.",
    responseType: "text",
    rewardKind: "ASTEROID",
  },
  {
    key: "what_eating",
    title: "Show what you're eating",
    instructions: "Send a photo of a meal or snack and a short note.",
    responseType: "photo_text",
    rewardKind: "FLOWER",
  },
  {
    key: "want_to_do",
    title: "One thing to do together",
    instructions: "Write one thing you want to do together soon.",
    responseType: "text",
    rewardKind: "NEBULA",
  },
  {
    key: "recreate_photo",
    title: "Recreate an old photo",
    instructions: "Recreate a shared memory in a new photo from where you are.",
    responseType: "photo",
    rewardKind: "SPECIAL_STAR",
  },
  {
    key: "best_moment",
    title: "Today's best moment",
    instructions: "Describe the best small moment of your day.",
    responseType: "text",
    rewardKind: "FRAGMENT",
  },
];

export function rewardLabel(kind: QuestRewardKind): string {
  switch (kind) {
    case "FRAGMENT":
      return "Cosmic fragment";
    case "ASTEROID":
      return "Small asteroid";
    case "FLOWER":
      return "Flower";
    case "NEBULA":
      return "Nebula bloom";
    case "SPECIAL_STAR":
      return "Special star";
  }
}
