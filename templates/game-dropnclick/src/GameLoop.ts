import { Drop, Variant } from "./content/drop";
import { GameConfig } from "./content/gameConfig";
import { TextStyle } from "./content/basicTypes";

import { v4 as uuidv4 } from 'uuid';
import { sortedIndexBy } from "lodash";

type Point2D = {
  x: number;
  y: number;
}

type Item = Drop & Partial<Variant>;

export type GameEntity = {
  /* This is a UUID. And it can be abused to trigger a rerender/restart of any entity's animation */
  id: string;

  // Note: The (x, y) coordinates use the center of screen as origin
  
  /* The (x, y) position of the entity when created */
  startX: number;
  startY: number;

  text: string;
  textStyle?: TextStyle;
  drop: Item;
  dropIsVariant: boolean;

  rarity: number;
  tier: number;

  wasClicked?: boolean;
}

const TICK_INTERVAL = 200;
const DEFAULT_RANDOM_SPEED = 50;

export type GameLoopProps = {
  gameConfig: GameConfig;
  setEntities: (_callback: (entities: GameEntity[]) => GameEntity[]) => void;
  setMovementSpeed: (_callback: (speed: Point2D) => Point2D) => void;
  setScreenDeltaToZero: () => void;
  setScore: (_callback: (score: number) => number) => void;
}

export class GameLoop {
  private props: GameLoopProps;
  private tick: number;

  // --- Game state ---
  private directionAngleRadian: number;
  private maxTier: number;   // eligible tier is [0, maxTier)

  // The current speed of the player / of the canvas screen
  private speedX: number;
  private speedY: number;

  // The delta in position of the screen, at the next tick
  private deltaX: number;
  private deltaY: number;

  // --- Derived constants ---
  private directionChangeTicks: number;
  private directionChangeMaxDeltaRadians: number;
  private dropTable: Record<number, Record<number, [number, Item][]>>;    // [tier][rarity] -> [CDF of P(drop), drop] sorted by CDF
  private rarityTable: number[];    // rarity -> CDF of P(rarity)

  _getRandomSpeed(): Point2D {
    const { effects } = this.props.gameConfig;
    const speedScalar = effects.find((effect) => effect.type === "movementSpeed")?.baseValue || DEFAULT_RANDOM_SPEED;
    const deltaAngle = (Math.random() * 2 - 1) * this.directionChangeMaxDeltaRadians;
    this.directionAngleRadian = (this.directionAngleRadian + deltaAngle) % (2 * Math.PI);
    return {
      x: speedScalar * Math.cos(this.directionAngleRadian),
      y: speedScalar * Math.sin(this.directionAngleRadian),
    };
  }

  _getRandomDrop(): Item {
    let effectiveTier = Math.floor(Math.random() * this.maxTier);
    let effectiveRarity = sortedIndexBy(this.rarityTable, Math.random());
    let table = this.dropTable[effectiveTier]?.[effectiveRarity];
    while (!table) {
      effectiveRarity -= 1;
      if (effectiveRarity < 0) {
        throw new Error(`Invalid game config: no drops found for tier "${effectiveTier}" and rarity "${effectiveRarity}"`);
      }
      table = this.dropTable[effectiveTier]?.[effectiveRarity];
    }

    const effectiveDropIndex = sortedIndexBy(
      table,
      [Math.random(), undefined as any],
      ([cdf]) => cdf
    );
    return table[effectiveDropIndex][1];
  }

  _getSpawnsThisTick(spawnRate: number): number {
    const spawnsPerTick = Math.floor(spawnRate * TICK_INTERVAL / 1000);
    const spawnsProbabilityPerTick = spawnRate * TICK_INTERVAL / 1000 - spawnsPerTick;
    return Math.random() < spawnsProbabilityPerTick ? spawnsPerTick + 1 : spawnsPerTick;
  }

  _getScore(item: Item): number {
    const { gameConfig } = this.props;
    const rarity = (item.rarity || item.baseRarity) + 1;
    const tier = item.baseTier + 1;
    if (gameConfig.scoreFunction === "A * rarity * B ^ tier") {
      return gameConfig.scoreFunctionParamA * rarity * Math.pow(gameConfig.scoreFunctionParamB, tier);
    } else if (gameConfig.scoreFunction === "A * rarity * tier ^ B") {
      return gameConfig.scoreFunctionParamA * rarity * Math.pow(tier, gameConfig.scoreFunctionParamB);
    } else {
      throw new Error(`Invalid game config: unknown score function "${gameConfig.scoreFunction}"`);
    }
  }

  constructor(props: GameLoopProps) {
    const { gameConfig } = props;
    this.props = props;
    this.tick = 0;
    this.maxTier = 1;
    this.directionAngleRadian = Math.random() * 2 * Math.PI;
    this.directionChangeTicks = Math.ceil(
      gameConfig.player.directionChangeInterval * 1000 / TICK_INTERVAL
    );
    this.directionChangeMaxDeltaRadians = gameConfig.player.directionChangeMaxAngle * Math.PI / 180;

    const speed = this._getRandomSpeed();
    this.speedX = speed.x;
    this.speedY = speed.y;
    this.deltaX = 0;
    this.deltaY = 0;

    this.rarityTable = Array.from({ length: gameConfig.rarities.length });
    let _rarityCdfSum = 0;
    Object.values(gameConfig.rarities).forEach((rarity, index) => {
      this.rarityTable[index] = _rarityCdfSum + rarity.weight;
      _rarityCdfSum = this.rarityTable[index];
    });
    this.rarityTable.forEach((_, index) => {
      this.rarityTable[index] /= _rarityCdfSum;
    });

    this.dropTable = {};
    Object.values(gameConfig.drops).forEach((drop) => {
      const tier = drop.baseTier;
      const existingCdf = this.dropTable[tier]?.[drop.baseRarity]?.reduce((acc, [cdf, _]) => acc + cdf, 0) || 0;
      let cdf = existingCdf + drop.baseWeight;
      this.dropTable[tier] ||= {};
      this.dropTable[tier][drop.baseRarity] ||= [];
      this.dropTable[tier][drop.baseRarity].push([cdf, drop]);
      drop.variants.forEach((variant) => {
        cdf += variant.weight;
        this.dropTable[tier][variant.rarity] ||= [];
        this.dropTable[tier][variant.rarity].push([cdf, { ...drop, ...variant }]);
      });
    });

    // Normalize the drop table
    Object.values(this.dropTable).forEach((tier) => {
      Object.values(tier).forEach((rarity) => {
        const total = rarity.reduce((acc, [cdf, _]) => acc + cdf, 0);
        rarity.forEach(item => {
          item[0] /= total;
        });
      });
    });
  }

  /* Returns the setInterval id */
  run() {
    this._doTick();
    this.tick++;
    return setInterval(() => {
      this._doTick();
      this.tick++;
    }, TICK_INTERVAL);
  }

  private _doTick() {
    const { gameConfig, setEntities, setMovementSpeed, setScore, setScreenDeltaToZero } = this.props;
    setEntities((entities) => {
      let deltaScore = 0;

      // Remove clicked entities
      let newEntities = entities.filter((entity) => {
        if (entity.wasClicked) {
          deltaScore += Math.ceil(this._getScore(entity.drop));
        }
        return !entity.wasClicked;
      });
      setScore((score) => score + deltaScore);

      // Spawn new entities
      const spawnRate = gameConfig.tiers[this.maxTier - 1].baseDropRate;
      const spawnsThisTick = this._getSpawnsThisTick(spawnRate);
      Array.from({ length: spawnsThisTick }).forEach(() => {
        // Spawning the new entity, relative to screen space position, by subtracting parent offset
        const startX = Math.random() * window.innerWidth - this.deltaX;
        const startY = Math.random() * window.innerHeight - this.deltaY;
        const item = this._getRandomDrop();
        const dropIsVariant = "name" in item;
        newEntities.push({
          id: uuidv4(),
          startX,
          startY,
          text: item.name || item.baseName,
          textStyle: dropIsVariant ? item.textStyle : item.baseTextStyle,
          drop: item,
          dropIsVariant,
          rarity: item.rarity || item.baseRarity,
          tier: item.baseTier,
        });
      });

      // Update screen's delta position
      this.deltaX += this.speedX * TICK_INTERVAL / 1000;
      this.deltaY += this.speedY * TICK_INTERVAL / 1000;

      // Remove entities that moved out of view (right now, the entities are at their start* positions)
      newEntities = newEntities.filter((entity) => {
        return entity.startX + this.deltaX > 0 && entity.startX + this.deltaX < window.innerWidth
          && entity.startY + this.deltaY > 0 && entity.startY + this.deltaY < window.innerHeight;
      });

      // Update movement speed and renormalize entities' startX, startY positions
      if (this.tick % this.directionChangeTicks === 0) {
        const oldSpeedX = this.speedX;
        const oldSpeedY = this.speedY;
        const speed = this._getRandomSpeed();
        this.speedX = speed.x;
        this.speedY = speed.y;
        newEntities = newEntities.map((entity) => ({
          ...entity,
          startX: entity.startX + this.deltaX - oldSpeedX * TICK_INTERVAL / 1000,
          startY: entity.startY + this.deltaY - oldSpeedY * TICK_INTERVAL / 1000,
        }));
        this.deltaX = this.speedX * TICK_INTERVAL / 1000;
        this.deltaY = this.speedY * TICK_INTERVAL / 1000;
        setScreenDeltaToZero();
      }
      setMovementSpeed(() => ({
        x: this.speedX,
        y: this.speedY,
      }));

      return newEntities;
    });
  }
}