import { Drop, Variant } from "./content/drop";
import { GameConfig } from "./content/gameConfig";
import { TextStyle } from "./content/basicTypes";

import { v4 as uuidv4 } from 'uuid';

export type GameEntity = {
  /* This is a UUID. And it can be abused to trigger a rerender/restart of any entity's animation */
  id: string;

  // Note: The (x, y) coordinates use the center of screen as origin
  
  /* The (x, y) position of the entity when created */
  startX: number;
  startY: number;

  text: string;
  textStyle: TextStyle;
  drop: Drop;
  dropVariant?: Variant;

  rarity: number;
  tier: number;

  wasClicked?: boolean;
}

const TICK_INTERVAL = 500;
const SPAWN_INTERVAL = 1000;
const CHANGE_MOVEMENT_INTERVAL = 4000;

type Point2D = {
  x: number;
  y: number;
}

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
  private speedX: number;
  private speedY: number;

  // The delta in position of the screen, at the next tick
  private deltaX: number;
  private deltaY: number;

  static _getRandomDrop(gameConfig: GameConfig) {
    const { drops } = gameConfig;
    const randomIndex = Math.floor(Math.random() * drops.length);
    const randomVariantIndex = Math.floor(Math.random() * (drops[randomIndex].variants.length + 1));
    return {
      drop: drops[randomIndex],
      variant: randomVariantIndex === drops[randomIndex].variants.length ? undefined : drops[randomIndex].variants[randomVariantIndex],
    };
  }

  _getRandomSpeed(): Point2D {
    const { effects } = this.props.gameConfig;
    const speedScalar = effects.find((effect) => effect.type === "movementSpeed")?.baseValue || 50;
    const angle = Math.random() * 2 * Math.PI;
    return {
      x: speedScalar * Math.cos(angle),
      y: speedScalar * Math.sin(angle),
    };
  }

  constructor(props: GameLoopProps) {
    this.props = props;
    this.tick = 0;
    const speed = this._getRandomSpeed();
    this.speedX = speed.x;
    this.speedY = speed.y;
    this.deltaX = 0;
    this.deltaY = 0;
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
    const { drop, variant } = GameLoop._getRandomDrop(gameConfig);
    setEntities((entities) => {
      let deltaScore = 0;

      // Remove clicked entities
      let newEntities = entities.filter((entity) => {
        if (entity.wasClicked) {
          deltaScore += 1;
        }
        return !entity.wasClicked;
      });
      setScore((score) => score + deltaScore);

      // Spawn new entities
      if (this.tick % (SPAWN_INTERVAL / TICK_INTERVAL) === 0) {
        // Spawning the new entity, relative to screen space position, by subtracting parent offset
        const startX = Math.random() * window.innerWidth - this.deltaX;
        const startY = Math.random() * window.innerHeight - this.deltaY;
        newEntities.push({
          id: uuidv4(),
          startX,
          startY,
          text: variant?.name || drop.baseName,
          textStyle: variant?.textStyle || drop.baseTextStyle,
          drop,
          dropVariant: variant,
          rarity: variant?.rarity || drop.baseRarity,
          tier: drop.baseTier,
        });
      }

      // Update screen's delta position
      this.deltaX += this.speedX * TICK_INTERVAL / 1000;
      this.deltaY += this.speedY * TICK_INTERVAL / 1000;

      // Remove entities that moved out of view (right now, the entities are at their start* positions)
      newEntities = newEntities.filter((entity) => {
        return entity.startX + this.deltaX > 0 && entity.startX + this.deltaX < window.innerWidth
          && entity.startY + this.deltaY > 0 && entity.startY + this.deltaY < window.innerHeight;
      });

      // Update movement speed and renormalize entities' startX, startY positions
      if (this.tick % (CHANGE_MOVEMENT_INTERVAL / TICK_INTERVAL) === 0) {
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