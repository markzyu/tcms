(() => {
  if (!window.tcms) {
    window.tcms = {};
  }
  if (!window.tcms.cdnBridge) {
    window.tcms.cdnBridge = {
      initialContentJson: {
        tiers: [
          { weight: 100, baseDropRate: 2, pGlobalEffect: 0.1 },
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
          { type: "movementSpeed", baseValue: 20, maxValue: 200 },
          { type: "itemVisibility", baseValue: 1, maxValue: 10 },
          { type: "screenZoom", baseValue: 1, maxValue: 10 },
        ],
        player: {
          directionChangeInterval: 4,
          directionChangeMaxAngle: 90,
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
        scoreFunctionParamA: 10,
        scoreFunctionParamB: 1.05,
      },
      getCDNType: () => "localCDN",
      getContentJsonPath: () => "/__query__/content.en.json",
      getInitialPreviewVariant: () => "en",
      getInstanceRootPath: () => "/",
      getOriginUrl: () => new URL("http://localhost:3000"),
      fetchContentJson: () => Promise.reject(new Error("Not implemented")),
      loadJsLibrary: () => Promise.resolve(),
      loadEsModule: () => Promise.resolve({}),
    };
  }
})();
