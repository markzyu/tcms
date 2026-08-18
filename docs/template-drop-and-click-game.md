# Idea: Drop-and-click game template

In order to fully test out the Json Template Editor workflows, I need a more complciated website template. It seems fun to build a basic "cookie clicker" style game

## Gameplay 

* Game starts with an empty screen.
* "Drops" randomly appear on the screen as colorized/stylized labels and/or static/animated images, as configured by template editor.
* Player can click on a drop to collect it. (with potentially a miss chance and a crit chance)
  * The "player location" is contantly moving to a random direction.
  * This random movement stays fixed for a short period of time, then changes to a new random direction.
* Drops that are not collected within a certain time, or that are off screen, are lost.
* There is no global map / coordinate
  * It's likely that the random brownian movement brings the player back to the starting point eventually.
  * However there is no way for a player to tell because those drops would have been lost anyways.

## Scoring

There are 2 score modes (and thus 2 game modes):

* Max score: Given a limited amount of time, the player is tasked to collect as many drops as possible.
* Lives mode: Certain items must be collected in order to stay alive. There are a limited number of lives. High score is the amount of time the player can survive.
* (Potential future support for a RPG mode where the items have health and can damage the player)

Note: In all modes, certain items should be able to grant effects to the player:

Defining Effects:

* Movement speed
* Screen zoom ratio (Shows more area/items on screen)
* Item visibility (Shows rarer/more important items as bigger. At higher tiers, filters out items irrelevant to the score. + reveals potentially hidden items)
* Whirlpool attraction (not exactly picking the items up, but keeping the items on screen)
* Drop rate modification (quantity and rarity only, never tier)
* Miss chance modifiers (probability to miss the drop)
* Crit chance modifiers(probability to double the score value of the drop)
* Crit multiplier modifiers

Unique effects:

* Effect magnitude reroll (rerolls the effects you already have, randomly. up OR down per effect)
* Effect duration reroll (rerolls the duration you already have, randomly. up OR down per effect)

All effects are stackable and additive. However, some, like item visibility, can start at a negative probability value (and needs enough stacks to trigger unhiding, for example)

## Misc. Definitions

Defining the "Drop Level":

* Rarity: Normal, Epic, Legendary, Mythic, etc.
* Tier: 1, 2, 3, 4, 5, etc.
* "Drop Level": A joint of rarity and score level. 
  * Example name: "Normal T1".
  * Score should be specified by the tier template content as a function of Rarity and Tier.

In general, the tier increases slowly as time goes on. But rarity can roll randomly.

To calculate what to drop, the game

* Rolls a drop quantity based on the maximum tier available at the current time.
* Rolls an effective tier based on the maximum tier, and each tier's probability.
* Rolls a rarity based on the rarity probability table (not depending on time)
* This drop must be an exact match of the effective tier and rarity.
* List all eligible drops (base and variants) and apply weights. And roll the exact drop.
   * Note: A variant and a base have no relation to each other during this roll. they are just authored together for convenience.
* Roll the global effect probability of the current tier. If this allows an effect to exist, then the effects/prefix on the drop is rolled from the effect probability table of the BASE type. (Unique effects are included in the roll UNLESS they are on cooldown.)

To calculate the score value of a hit on a drop:

score_function(Rarity, Tier) * (1 - miss_chance) * (1 + crit_chance * crit_multiplier)

where the score_function comes from per-tier configuration first, and defaults to a global config.

## Template data (Vague preview of schema)

Let's first summarize what the game needs to know about drops:

* Base Name
* Base Styles: Three styling options as 3 singleton fields:
  * Can have a CSS style list for the final label (These override a default style for all drops)
  * Can have an optional image (which covers static and animated images)
* Base movement types: A list of possible ways for the drop to move on its own.
  * Could just be enum: "static" (no movement)
  * Or it could be an enum: "brownian" (random movement, and needs a movement speed)
* Animation On Pickup: A list of possible animations to play when the drop is picked up
  * Provide a few basic predefined ones for now. (Use string enums: "flyToHud", "zoomOutAndFade")
* Animation On Drop (a similar list)
* <u>Base Rarity/Tier</u>: This determines the base rarity and tier that is required to drop this base item.
* <u>Base Weight</u>: Given that we want a drop at the same level, how likely is it to be this drop?
* Effects: This determines all possible in-game effects. And it's also used as a prefix for the item name.
  * Effect type (from a string enum)
  * Effect duration (seconds. If 0, the effect is permanent.)
  * Effect weight (probability to roll this prefix.)
  * Is hidden (bool. If true, the effect is not shown in name or styles. But it still triggers the effect.)
* Variants: This determines all visual variations of the item. And it's also used as a suffix for the item name.
  * Variant name (string)
  * Rarity (string enum)
  * Style (Similar to base styles. Optional. Overrides the base style for this variant.)
  * Variant weight (Similar to base weight)
  * Animation On Pickup: optional override.

Each instance of these drops can only have one base name, one rarity/tier, one movement type, one effect, and one variant. But the template defines all random possibilities for each of these fields.

Let's also summarize what the game needs to know about the global attributes:

* Scoring control
  * Time limit for max score mode.
  * Lives limit / starting lives count for lives mode.
  * Lives loss config for lives mode. (String enum: "missesHighestTier", "missesRarest")
  * Score screen content (images, i18n text, etc)
  * Number of high scores to display
  * Screen content for the list of collected items
  * Default score_function(Rarity, Tier)
* Various on screen messages (i18n text)
* Global Popup screens/animations to choose from.
  * Starting a game
  * Game over
  * Game paused
  * HUD during normal gameplay
  * Effects obtained
* Base Tier rate (How likely is it for a drop to be of each tier. This depends on time.)
  * A list of objs: `{start_time, tiers[]}` where each tier is the following:
  * Tier ID (0, 1, 2, 3, 4, 5, ... )
  * Tier name (optional string, defaults to `T{id + 1}`)
  * Tier weight (when multiple tiers are eligible, how often can a drop roll this tier)
  * Tier background color (optional)
  * Tier background image/media (optional)
  * Tier background css style (optional)
  * Tier's base drop rate. (quantity / second)
  * Tier's base miss chance
  * Tier's base crit chance
  * Tier's base global effect probability (Whether a new drop has an effect prefix at all)
  * Override score_function(Rarity) for this tier
* Rarity catalog
  * Rarity IDs
  * Rarity i18n names
  * Base rarity rate (How likely is it for a drop to be of each rarity. This doesn't depend on time.)
* Base value for all the in-game effects (before player obtained new effects)
  * Base player movement speed.
  * Base player whirlpool attraction. (should be 0 but can be changed by game authors)
  * Base screen zoom ratio.
  * Base item visibility. (probability to highlight important items. probability to show hidden items. probability to hide irrelevant items. these can start at negative.)
  * etc.
* The maximum stack count for each effect.
* Unique effects:
  * Effect magnitude reroll: The probability table: P(how much percentage to add or subtract) with a discrete number of possible percentages.
  * Effect duration reroll: The probability table: P(how much percentage to add or subtract) with a discrete number of possible percentages.
  * Per unique effect cooldown: How often each unique effect can show up in a single game.
  * Max unique effect cooldown: How often ANY unique effect can show up.
* Player entity
  * Direction change interval (seconds)
  * Direction change max angle (degrees)
  * (Player visual style is assumed to be invisible, no image on screen, for now)
  * (Attack hit style is assumed to be "point-sized hitscan" for now. we can do projectiles and AOE later)


Very very optional improvements: there should be some schema for game authors' "ergonomics":

* CSS Animation and styles would be hell to copy and paste whenever a new drop / tier is created.
* Hopefully we can provide a tool that searches through previous entries to help authors quickly fill in a similar one. (This might be incorporatable if the existing "textarea" input type can come with a searchLabel and a search screen)

## Runtime user data

Item drop tables, etc are considered template data. Here we discuss what user-side data are needed.

* Last 5 high scores for each mode.
  * Score, timestamp, and game mode, and the list of collected items in that run.
  * (+ hopefully a playback json that stores a highlight gameplay as a json to play back)
* List of rare items collected (and how many items are undiscovered)


## Notes: Schema suggestions

Fixed animation names should describe the look and feel, not the 2D/3D implementation. "flyToHud" instead of "moveToRight"

And, though we explicitly said to store "CSS animations" as a field, it's much better to instead store a list of "animation file paths" at the root json, and then reference animations by name. (without assuming whether it's CSS, 2D or 3D)

This would help the schema migrate if we want a 3D non-TCMS game engine later, and if we want to reuse the same content jsons. (Images -> 3D Models and textures. CSS files -> 3D animation files. But names/paths stay the same)
