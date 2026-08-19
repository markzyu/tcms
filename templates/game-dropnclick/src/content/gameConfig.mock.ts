import type { GameConfig } from "./gameConfig";

// Note: "Required" type is used to inform testcases that all fields have a value,
//       so that helper functions like `toHaveTextContent()` can be used without type assertions.
export const defaultGameConfig: Required<GameConfig> = {
  tiers: [
    { weight: 100, baseDropRate: 2, pGlobalEffect: 0.5 },
    { weight: 10, baseDropRate: 1, pGlobalEffect: 0.05 },
    { weight: 1, baseDropRate: 0.5, pGlobalEffect: 0.01 },
  ],
  rarities: [
    {
      name: "Common",
      weight: 100,
      textStyle: {},
    },
    {
      name: "Rare",
      weight: 10,
      textStyle: {
        backgroundColor: "#000000",
        fontColor: "#F9F018"
      },
    },
    {
      name: "Legendary",
      weight: 1,
      textStyle: {
        backgroundColor: "#000000",
        fontColor: "#FF4500"
      },
    },
  ],
  effects: [
    { type: "movementSpeed", emojiIcon: "👟", baseValue: 20, maxValue: 200 },
    { type: "itemVisibility", emojiIcon: "🔍", baseValue: 1, maxValue: 10 },
    { type: "screenZoom", emojiIcon: "📺", baseValue: 1, maxValue: 10 },
  ],
  player: {
    directionChangeInterval: 4,
    directionChangeMaxAngle: 90,
    rarityVisibilityThreshold: 2,
    effectVisibilityThreshold: 2,
  },
  drops: [
    {
      baseName: "Bottle",
      name: "Plastic Bottle",
      baseRarity: 0,
      baseTier: 0,
      baseWeight: 100,
      baseTextStyle: { fontColor: "#000000" },
      baseMedia: [],
      animationOnPickup: "zoomOutAndFade",
      animationOnDrop: "zoomOutAndFade",
      effects: [
        {
          type: "movementSpeed",
          duration: 20,
          weight: 100,
          isHidden: false,
          minPctChange: 50,
          maxPctChange: 70,
        },
        {
          type: "itemVisibility",
          duration: 20,
          weight: 100,
          isHidden: true,
          minPctChange: 10,
          maxPctChange: 20,
        }
      ],
      variants: [
        {
          name: "Glass Bottle",
          rarity: 1,
          weight: 10,
          textStyle: {},
          media: [],
        }
      ]
    }
  ],
  scoreFunction: "A * rarity * B ^ tier",
  scoreFunctionParamA: 10,
  scoreFunctionParamB: 1.05,
};