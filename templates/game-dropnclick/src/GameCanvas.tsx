import { Drop, Variant } from "./content/drop";
import { GameConfig } from "./content/gameConfig";
import { TEST_IDS } from "./constants";
import { TextStyle } from "./content/basicTypes";

import { useEffect, useState } from "react";
import { usePageContentContext } from "@tcms/mini-app-react-utils";
import { v4 as uuidv4 } from 'uuid';

type GameEntity = {
  id: string;
  /** The (x, y) coordinates use the center of screen as origin */
  startX: number;
  startY: number;
  startTime: number;
  text: string;
  textStyle: TextStyle;
  drop: Drop;
  dropVariant?: Variant;

  wasClicked?: boolean;
}

const TICK_INTERVAL = 200;
const SPAWN_INTERVAL = 1000;

export const getRandomDrop = (gameConfig: GameConfig) => {
  const { drops } = gameConfig;
  const randomIndex = Math.floor(Math.random() * drops.length);
  const randomVariantIndex = Math.floor(Math.random() * (drops[randomIndex].variants.length + 1));
  return {
    drop: drops[randomIndex],
    variant: randomVariantIndex === drops[randomIndex].variants.length ? undefined : drops[randomIndex].variants[randomVariantIndex],
  };
}

export type GameLoopProps = {
  gameConfig: GameConfig;
  tick: number;
  setEntities: (_callback: (entities: GameEntity[]) => GameEntity[]) => void;
  setScore: (_callback: (score: number) => number) => void;
}

const speedX = (Math.random() - 0.5) * 100;
const speedY = (Math.random() - 0.5) * 100;

export const gameLoopTick = (props: GameLoopProps) => {
  const { gameConfig, tick, setEntities, setScore } = props;
  const { drop, variant } = getRandomDrop(gameConfig);
  const startX = Math.random() * window.innerWidth * 3 / 4;
  const startY = Math.random() * window.innerHeight * 3 / 4;
  const currTime = Date.now();
  setEntities((entities) => {
    const SPWAN_TICK = SPAWN_INTERVAL / TICK_INTERVAL;
    let deltaScore = 0;
    const newEntities = entities.filter((entity) => {
      if (entity.wasClicked) {
        deltaScore += 1;
      }
      return !entity.wasClicked;
    });
    setScore((score) => score + deltaScore);
    if (tick % SPWAN_TICK === 0) {
      newEntities.push({
        id: uuidv4(),
        startX,
        startY,
        startTime: Date.now(),
        text: variant?.name || drop.baseName,
        textStyle: variant?.textStyle || drop.baseTextStyle,
        drop,
        dropVariant: variant,
      });
    }
    return newEntities.filter((entity) => {
      const movementX = speedX * (currTime - entity.startTime) / 1000;
      const movementY = speedY * (currTime - entity.startTime) / 1000;
      return (
        entity.startX + movementX > 0 && entity.startX + movementX < window.innerWidth
        && entity.startY + movementY > 0 && entity.startY + movementY < window.innerHeight
      );
    });
  });
};

// Allow custom CSS properties to be used in style attribute
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string;
  }
}

export const GameCanvas = () => {
  const { contentJson, isLoading } = usePageContentContext<GameConfig>();
  const [entities, setEntities] = useState<GameEntity[]>([]);
  const [score, setScore] = useState(0);
  if (!contentJson || isLoading) return "Loading...";

  useEffect(() => {
    let tick = 0;
    setInterval(() => {
      gameLoopTick({ gameConfig: contentJson, tick, setEntities, setScore });
      tick++;
    }, TICK_INTERVAL);
  }, [contentJson, setEntities, setScore]);

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
            '--speed-x-for-100-secs': `${speedX * 100}px`,
            '--speed-y-for-100-secs': `${speedY * 100}px`,
          }}
          onClick={onClickEntity(entity)}
        >
          {entity.text}
        </div>
      ))}
    </div>
  );
};