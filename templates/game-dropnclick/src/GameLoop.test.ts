import { GameEntity, GameLoop } from "./GameLoop";
import { defaultGameConfig } from "./content/gameConfig.mock";

// Assumptions for DEFAULT_RANDOM_SPEED:
//   * the constructor uses the first random value to initialize the direction angle, and 0.5 means Pi radians
//   * the constructor requires remaining random values to be 0.5 so as not to randomly update the angle during init
const DEFAULT_RANDOM_SPEED = 0.5;

const mockRandom = jest.fn();
GameLoop.prototype._random = mockRandom;

const mockGameLoopArgs = {
  gameConfig: defaultGameConfig,
  onCollectDrop: jest.fn(),
  setEntities: jest.fn(),
  setEffects: jest.fn(),
  setMovementSpeed: jest.fn(),
  setScore: jest.fn(),
  setScreenDeltaToZero: jest.fn(),
};

const mockEntity: GameEntity = {
  id: "1",
  startX: 4,
  startY: 10,
  text: "Test",
  textFullNameAndEffect: "Test",
  textStyle: {},
  drop: {
    ...defaultGameConfig.drops[0],
    baseDropIndex: 0,
    dropIsVariant: false,
  },
  dropIsVariant: false,
  rarity: 0,
  tier: 0,
};

const spyOnNewEntities = jest.fn();

mockGameLoopArgs.setEntities.mockImplementation((setter) => {
  const entities: GameEntity[] = [
    {
      ...mockEntity,
      id: "1",
      startX: 4,
      startY: 10,
    },
    {
      ...mockEntity,
      id: "2",
      startX: 20,
      startY: 10,
    },
  ];
  spyOnNewEntities(setter(entities));
});

describe("GameLoop", () => {
  beforeEach(() => {
    mockRandom.mockReset();
    spyOnNewEntities.mockReset();
  });

  it("should initialize game states", () => {
    mockRandom.mockReturnValue(DEFAULT_RANDOM_SPEED);
    const gameLoop = new GameLoop(mockGameLoopArgs);
    expect(gameLoop.tick).toBe(0);
    expect(gameLoop.directionAngleRadian).toBeCloseTo(Math.PI);
    // TODO: GameLoop doesn't support tiers yet
    expect(gameLoop.maxTier).toBe(1);
    expect(gameLoop.effects).toEqual({});
    expect(gameLoop.speedX).toBeCloseTo(-20);
    expect(gameLoop.speedY).toBeCloseTo(0);
    expect(gameLoop.deltaX).toBe(0);
    expect(gameLoop.deltaY).toBe(0);
    expect(gameLoop.directionChangeTicks).toBe(20);
    expect(gameLoop.directionChangeMaxDeltaRadians).toBeCloseTo(Math.PI / 2);

    expect(gameLoop.rarityTable).toEqual([100/111, 110/111, 1]);
    expect(gameLoop.effectTable).toEqual({
      0: [
        [0.5, { type: "movementSpeed", duration: 20, weight: 100, isHidden: false, minPctChange: 50, maxPctChange: 70 }],
        [1, { type: "itemVisibility", duration: 20, weight: 100, isHidden: true, minPctChange: 10, maxPctChange: 20 }],
      ]
    });
    expect(gameLoop.dropTable).toEqual({
      0: {
        0: [
          [1, expect.objectContaining({
            baseDropIndex: 0,
            dropIsVariant: false,
            baseName: "Bottle",
            name: "Plastic Bottle",
            baseRarity: 0,
            baseTier: 0,
            baseWeight: 100,
            baseTextStyle: { fontColor: "#000000" },
            baseMedia: [],
            animationOnPickup: "zoomOutAndFade",
            animationOnDrop: "zoomOutAndFade",
          })]
        ],
        1: [
          [1, expect.objectContaining({
            baseDropIndex: 0,
            dropIsVariant: true,
            baseName: "Bottle",
            name: "Glass Bottle",
            rarity: 1,
            weight: 10,
            textStyle: {},
            media: [],
          })]
        ]
      }
    });
  });

  it("should initialize when ticks, speed have slightly uneven seeds", () => {
    // Assumptions:
    //   * the constructor uses the first random value to initialize the direction angle,
    //   * the constructor requires remaining random values to be 0.5 so as not to randomly update the angle during init
    mockRandom.mockReturnValueOnce(0.125).mockReturnValue(DEFAULT_RANDOM_SPEED);
    const gameLoop = new GameLoop({
      ...mockGameLoopArgs,
      gameConfig: {
        ...defaultGameConfig,
        player: {
          ...defaultGameConfig.player,
          directionChangeInterval: 0.3,
        },
      },
    });
    expect(gameLoop.tick).toBe(0);
    expect(gameLoop.directionAngleRadian).toBeCloseTo(Math.PI / 4);
    expect(gameLoop.speedX).toBeCloseTo(10 * Math.sqrt(2));
    expect(gameLoop.speedY).toBeCloseTo(10 * Math.sqrt(2));
    expect(gameLoop.directionChangeTicks).toBe(2);
    expect(gameLoop.directionChangeMaxDeltaRadians).toBeCloseTo(Math.PI / 2);
  });
  
  it("moves screen and clears drops that are off screen", () => {
    mockRandom.mockReturnValue(DEFAULT_RANDOM_SPEED);
    const gameLoop = new GameLoop(mockGameLoopArgs);
    expect(gameLoop.deltaX).toBe(0);
    expect(gameLoop.deltaY).toBe(0);
    gameLoop.run(() => ({ width: 100, height: 100 }));
    expect(gameLoop.deltaX).toBeCloseTo(-4);
    expect(gameLoop.deltaY).toBeCloseTo(0);
    expect(spyOnNewEntities).toHaveBeenCalledWith([
      {
        ...mockEntity,
        id: "2",
        startX: 20,
        startY: 10,
      },
    ]);
  });

  it("renormalizes entities locations after movement direction changes", () => {
    mockRandom.mockReturnValue(DEFAULT_RANDOM_SPEED);
    const gameLoop = new GameLoop(mockGameLoopArgs);
    gameLoop.run(() => ({ width: 100, height: 100 }));
    expect(gameLoop.deltaX).toBeCloseTo(-4);
    expect(gameLoop.deltaY).toBeCloseTo(0);

    // Changing from 180 degrees to 90 degrees
    gameLoop.directionAngleRadian = Math.PI / 2;
    gameLoop.tick = 20;
    gameLoop.run(() => ({ width: 100, height: 100 }));
    expect(spyOnNewEntities).toHaveBeenCalledWith([
      {
        ...mockEntity,
        id: "2",
        startX: expect.closeTo(16, 0.01),
        startY: expect.closeTo(10, 0.01),
      },
    ]);

    expect(gameLoop.deltaX).toBeCloseTo(0);
    expect(gameLoop.deltaY).toBeCloseTo(4);
  });
});