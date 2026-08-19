import { GameConfig } from "./content/gameConfig";
import { TEST_IDS } from "./constants";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePageContentContext } from "@tcms/mini-app-react-utils";
import { EffectStatus, GameEntity, GameLoop } from "./GameLoop";
import { EffectType, TextStyle } from "./content/basicTypes";
import { drop } from "lodash";

const RARE_DROPS_HISTORY_SIZE = 10;
const HITBOX_SIZE = 10;

// Allow custom CSS properties to be used in style attribute
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string;
  }
}

export const getTextStyle = (textStyle: TextStyle, skipColor: boolean = false) => {
  return {
    backgroundColor: skipColor ? undefined : textStyle.backgroundColor,
    color: skipColor ? undefined : textStyle.fontColor,
  };
}

export const GameCanvas = () => {
  const { contentJson, isLoading } = usePageContentContext<GameConfig>();
  const [entities, setEntities] = useState<GameEntity[]>([]);
  const [movementSpeed, setMovementSpeed] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [effects, setEffects] = useState<Partial<Record<EffectType, EffectStatus>>>({});
  const [rareDropsHistory, setRareDropsHistory] = useState<GameEntity[]>([]);
  const screenRef = useRef<HTMLDivElement>(null);
  if (!contentJson || isLoading) return "Loading...";

  useEffect(() => {
    const setScreenDeltaToZero = () => {
      if (!screenRef.current) return;
      const backupAnimation = screenRef.current.style.animation;
      screenRef.current.style.animation = "none";
      void screenRef.current.offsetWidth;
      screenRef.current.style.animation = backupAnimation;
    }
    const onCollectDrop = (drop: GameEntity) => {
      const isRare = !!(drop.dropIsVariant || drop.effect?.type);
      isRare && setRareDropsHistory((history) => {
        return [...history.slice(-RARE_DROPS_HISTORY_SIZE), drop];
      });
    };
    const gameLoop = new GameLoop({
      gameConfig: contentJson,
      onCollectDrop,
      setEntities,
      setMovementSpeed,
      setScore,
      setScreenDeltaToZero,
      setEffects,
    });
    const getScreenSize = () => {
      const screenBox = screenRef.current?.getBoundingClientRect();
      return {
        width: screenBox?.width || 0,
        height: screenBox?.height || 0,
      };
    };
    const interval = gameLoop.run(getScreenSize);
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

  const effectsText = useMemo(() => {
    return Object.entries(effects).map(([effectType, { totalPctChange }]) => {
      const amount = totalPctChange ? `${totalPctChange > 0 ? '+' : '-'}${totalPctChange.toFixed(0)}%` : '';
      return <span className="mx-2" key={effectType}>{effectType} {amount}</span>;
    });
  }, [effects]);

  return (
    <div
      className="bg-blue-500 w-full h-full overflow-hidden flex flex-row"
      data-testid={TEST_IDS.gameRoot}
    >
      <div className="absolute z-10 top-0 left-0 w-full bg-red-500">Score: {score}. {effectsText}</div>
      <div ref={screenRef} className="relative flex-1 h-full" style={{
        animation: `movement 100s linear`,
        '--speed-x-for-100-secs': `${movementSpeed.x * 100}px`,
        '--speed-y-for-100-secs': `${movementSpeed.y * 100}px`,
      }}>
        {entities.map((entity) => (
          <div
            key={entity.id}
            className={`absolute text-nowrap overflow-hidden select-none ${entity.wasClicked ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{
              ...getTextStyle(
                {
                  ...contentJson.rarities[entity.rarity]?.textStyle,
                  ...(entity.dropIsVariant ? entity.drop?.textStyle : entity.drop.baseTextStyle),
                },
                entity.wasClicked
              ),
              left: entity.startX,
              top: entity.startY,
              transform: "translate(-50%, -50%)",
              padding: `${HITBOX_SIZE}px`,
            }}
            onClick={onClickEntity(entity)}
          >
            {!entity.effect?.isHidden ? <span className="text-red-700">{contentJson.effects.find((effect) => effect.type === entity.effect?.type)?.emojiIcon || ''}</span> : null}
            {entity.text}
          </div>
        ))}
      </div>
      <div className="relative z-10 w-64 h-full bg-gray-200 flex flex-col-reverse">
        {rareDropsHistory.map((entity) => (
          <div key={entity.id}>
            {entity.textFullNameAndEffect}
          </div>
        ))}
      </div>
    </div>
  );
};