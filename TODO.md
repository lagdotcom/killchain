# TODO

## Rule correctness

- **Delay**: No support for 'delaying action until after a lower initiative roller'.
- **Melee**: "Any units in adjacent squares are considered engaged in melee, and may take their melee attacks." It seems odd that units can just move out of melee, especially if they were charged. How to fix this? Should it be fixed?

Should be front-end options for optional rules (could be folded into Scenario stuff below?):

- **Morale**: The rules state that 12 is always a failure.
- **Spearmen**: "Spearmen automatically go first regardless of initiative and get +1 to their first attack rolls if they have used one action to “set” and have not moved in the same turn. This number increases to +2 vs. cavalry."
- Cavalry charge, archers being able to melee at -1 and flanking are all optional rules.

## Flashiness

- Animate unit movement and attacks
- Make the log nicer (hover unit name to highlight on battlefield?)
- Keyboard shortcuts
- Show combat target roll before attack

## Maps

- Save and load maps, export to json/whatever
- Random maps with seed, generation parameters
- More terrain types: water, ...?
- **Scaling**: the rules assume 10 feet squares, but could be scaled in or out
- **Hex maps**: heck yeah more accurate distance measurements and no more silly diagonals

## Units

- Save and load units, export to json/whatever
- Custom short names rather than auto generated
- Image instead of short name?

## Unit abilities

- **flying**: can ignore swamp/hill/water movement penalties
- **slayer**: chance of doing extra damage to certain unit types (cavalry, dwarf, large, whatever)
- **versatile archery**: can swap weapons in melee to negate -1 penalty, maybe after first attack

## Scenarios

- Save and load map/unit setups, export to json/whatever
- Sides can be allies to each other
- **Victory conditions**: occupy cells, rout/disperse specific unit, escape area intact, etc.

## AI

- **Personality**: aggressive/defensive, risk-taker/timid
- Selectable skill level
- Zero to all sides could be set to AI play
- Takes victory conditions into account

## Campaign play

- **Hiring/Upkeep costs**: per unit (10 per unit) amount based on troop category
- **Specialists**: also have upkeep, required for some troop types (Armourer for heavy, etc.)
- **Morale tracking**
  - "... every unit that survives a battle may make a morale test. If their roll succeeds, they may add 1 to their morale. This may be done a total of 3 times only, and a Morale roll of 12 is always a failure."
  - "Each time a battle is lost, roll a d6. On a 1-2, a random (roll %) amount of units have deserted the company. Carousing, pillaging and the like can add a +1 to this number for every 100 coin spent or village sacked and pillaged.
- **Mercenary Jobs**: d20 list of random jobs for a mercenary company, could be used to seed scenarios
