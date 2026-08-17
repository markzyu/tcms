import { Drop, Variant } from "./content/drop";
import { GameConfig } from "./content/gameConfig";
import { TEST_IDS } from "./constants";
import { TextStyle } from "./content/basicTypes";

import { useEffect, useState } from "react";
import { usePageContentContext } from "@tcms/mini-app-react-utils";
import { v4 as uuidv4 } from 'uuid';

type GameEntity = {
  id: string;
  // Note: The (x, y) coordinates use the center of screen as origin
  
  /* The (x, y) position of the entity when created */
  startX: number;
  startY: number;

  deltaX: number;
  deltaY: number;

  text: string;
  textStyle: TextStyle;
  drop: Drop;
  dropVariant?: Variant;

  wasClicked?: boolean;
}

const TICK_INTERVAL = 500;
const SPAWN_INTERVAL = 1000;
const CHANGE_MOVEMENT_INTERVAL = 4000;

export type GameLoopProps = {
  gameConfig: GameConfig;
  setEntities: (_callback: (entities: GameEntity[]) => GameEntity[]) => void;
  setMovementSpeed: (_callback: (speed: { x: number; y: number }) => { x: number; y: number }) => void;
  setScore: (_callback: (score: number) => number) => void;
}

export class GameLoop {
  private props: GameLoopProps;
  private tick: number;
  private speedX: number;
  private speedY: number;

  static _getRandomSpeed() {
    return (50 + (Math.random() - 0.5) * 50) * (Math.random() < 0.5 ? 1 : -1);
  }

  static _getRandomDrop(gameConfig: GameConfig) {
    const { drops } = gameConfig;
    const randomIndex = Math.floor(Math.random() * drops.length);
    const randomVariantIndex = Math.floor(Math.random() * (drops[randomIndex].variants.length + 1));
    return {
      drop: drops[randomIndex],
      variant: randomVariantIndex === drops[randomIndex].variants.length ? undefined : drops[randomIndex].variants[randomVariantIndex],
    };
  }

  constructor(props: GameLoopProps) {
    this.props = props;
    this.tick = 0;
    this.speedX = GameLoop._getRandomSpeed();
    this.speedY = GameLoop._getRandomSpeed();
  }

  runTick() {
    this._doTick();
    this.tick++;
  }

  private _doTick() {
    const { gameConfig, setEntities, setMovementSpeed, setScore } = this.props;
    const { drop, variant } = GameLoop._getRandomDrop(gameConfig);
    const currTime = Date.now();
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
        const startX = Math.random() * window.innerWidth * 3 / 4;
        const startY = Math.random() * window.innerHeight * 3 / 4;
        newEntities.push({
          id: uuidv4(),
          startX,
          startY,
          deltaX: 0,
          deltaY: 0,
          text: variant?.name || drop.baseName,
          textStyle: variant?.textStyle || drop.baseTextStyle,
          drop,
          dropVariant: variant,
        });
      }

      // Update entities' deltaX, deltaY positions
      newEntities = newEntities.map((entity) => ({
        ...entity,
        deltaX: entity.deltaX + this.speedX * TICK_INTERVAL / 1000,
        deltaY: entity.deltaY + this.speedY * TICK_INTERVAL / 1000,
      }));

      // Remove entities that moved out of view (right now, the entities are at their start* positions)
      newEntities = newEntities.filter((entity) => {
        return (
          entity.startX + entity.deltaX > 0 && entity.startX + entity.deltaX < window.innerWidth
          && entity.startY + entity.deltaY > 0 && entity.startY + entity.deltaY < window.innerHeight
        );
      });

      // Update movement speed and renormalize entities' startX, startY positions
      if (this.tick % (CHANGE_MOVEMENT_INTERVAL / TICK_INTERVAL) === 0) {
        const oldSpeedX = this.speedX;
        const oldSpeedY = this.speedY;
        this.speedX = GameLoop._getRandomSpeed();
        this.speedY = GameLoop._getRandomSpeed();
        newEntities = newEntities.map((entity) => ({
          ...entity,
          id: uuidv4(),
          startX: entity.startX + entity.deltaX - oldSpeedX * TICK_INTERVAL / 1000,
          startY: entity.startY + entity.deltaY - oldSpeedY * TICK_INTERVAL / 1000,
          deltaX: this.speedX * TICK_INTERVAL / 1000,
          deltaY: this.speedY * TICK_INTERVAL / 1000,
        }));
      }
      setMovementSpeed(() => ({
        x: this.speedX,
        y: this.speedY,
      }));

      return newEntities;
    });
  }
}

// Allow custom CSS properties to be used in style attribute
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string;
  }
}

export const GameCanvas = () => {
  const { contentJson, isLoading } = usePageContentContext<GameConfig>();
  const [entities, setEntities] = useState<GameEntity[]>([]);
  const [movementSpeed, setMovementSpeed] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  if (!contentJson || isLoading) return "Loading...";

  useEffect(() => {
    const gameLoop = new GameLoop({ gameConfig: contentJson, setEntities, setMovementSpeed, setScore });
    gameLoop.runTick();
    const interval = setInterval(() => {
      gameLoop.runTick();
    }, TICK_INTERVAL);
    return () => clearInterval(interval);
  }, [contentJson, setEntities, setMovementSpeed, setScore]);

  const onClickEntity = (entity: GameEntity) => () => {
    setEntities((entities) => {
      return entities.map((e) => {
        if (e.id === entity.id) {
          return { ...e, wasClicked: true };
        }
        return e;
      });
    });
  };

  return (
    <div
      className="bg-blue-500 w-full h-full overflow-hidden"
      data-testid={TEST_IDS.gameRoot}
    >
      <div className="absolute top-0 left-0 w-full bg-red-500">Score: {score}</div>
      {entities.map((entity) => (
        <div
          key={entity.id}
          className={`absolute select-none ${entity.wasClicked ? 'bg-green-500' : ''}`}
          style={{
            left: entity.startX,
            top: entity.startY,
            animation: `movement 100s linear`,
            '--speed-x-for-100-secs': `${movementSpeed.x * 100}px`,
            '--speed-y-for-100-secs': `${movementSpeed.y * 100}px`,
          }}
          onClick={onClickEntity(entity)}
        >
          {entity.text}
        </div>
      ))}
    </div>
  );
};