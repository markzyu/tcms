import type { GameConfig } from "./gameConfig";

// Note: "Required" type is used to inform testcases that all fields have a value,
//       so that helper functions like `toHaveTextContent()` can be used without type assertions.
export const defaultGameConfig: Required<GameConfig> = {
  tiers: [
    { weight: 100, baseDropRate: 2, pGlobalEffect: 0.1 },
    { weight: 10, baseDropRate: 1, pGlobalEffect: 0.05 },
    { weight: 1, baseDropRate: 0.5, pGlobalEffect: 0.01 },
  ],
  rarities: [
    { name: "Common", weight: 100, textStyle: {} },
    { name: "Rare", weight: 10, textStyle: {} },
    { name: "Legendary", weight: 1, textStyle: {} },
  ],
  effects: [
    { type: "movementSpeed", baseValue: 1, maxValue: 10 },
    { type: "itemVisibility", baseValue: 1, maxValue: 10 },
    { type: "screenZoom", baseValue: 1, maxValue: 10 },
  ],
  player: {
    directionChangeInterval: 1,
    directionChangeMaxAngle: 10,
  },
  drops: [
    {
      baseName: "Plastic Bottle",
      baseRarity: 0,
      baseTier: 0,
      baseWeight: 100,
      baseTextStyle: { fontColor: "#000000" },
      baseMedia: [],
      animationOnPickup: "zoomOutAndFade",
      animationOnDrop: "zoomOutAndFade",
      effects: [],
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
  scoreFunctionParamA: 100,
  scoreFunctionParamB: 1.05,
};