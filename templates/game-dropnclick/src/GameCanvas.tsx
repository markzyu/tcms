import { GameConfig } from "./content/gameConfig";
import { TEST_IDS } from "./constants";

import { useEffect, useState } from "react";
import { usePageContentContext } from "@tcms/mini-app-react-utils";
import { GameEntity, GameLoop } from "./GameLoop";

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
    const interval = gameLoop.run();
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
          className={`absolute text-nowrap overflow-hidden select-none ${entity.wasClicked ? 'bg-green-500' : ''}`}
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