/**
 * Damage calculation adapter.
 *
 * Implements the DamageCalcPort using a simplified Gen 1 damage formula.
 * Relies on TypeEffectivenessPort to compute type-based multipliers
 * from the bundled type-chart.json data.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type {
  DamageCalcInput,
  DamageResult,
  DamageCalcError,
  Effectiveness,
} from "@pokenerve/shared/types/battle";
import { FaintedAttacker, FaintedDefender, InvalidMove } from "@pokenerve/shared/types/battle";
import { DamageCalcPort } from "../../ports/battle.js";
import { TypeEffectivenessPort } from "../../ports/type-chart.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatValue(pokemon: DamageCalcInput["attacker"], statName: string): number {
  const stat = pokemon.pokemon.stats.find(s => s.stat.name === statName);
  return stat ? stat.base_stat : 50;
}

function clampEffectiveness(value: number): Effectiveness {
  if (value === 0) return 0;
  if (value <= 0.25) return 0.25;
  if (value <= 0.5) return 0.5;
  if (value >= 4) return 4;
  if (value >= 2) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Damage calc adapter
// ---------------------------------------------------------------------------

const damageCalcAdapter = createAdapter({
  provides: DamageCalcPort,
  requires: [TypeEffectivenessPort],
  lifetime: "scoped",
  factory: deps => {
    const typeService = deps.TypeEffectiveness;

    return {
      calculate(input: DamageCalcInput): Result<DamageResult, DamageCalcError> {
        const { attacker, defender, move, isCritical } = input;

        // Validate attacker is not fainted
        if (attacker.currentHp <= 0) {
          return err(FaintedAttacker({}));
        }

        // Validate defender is not fainted
        if (defender.currentHp <= 0) {
          return err(FaintedDefender({}));
        }

        // Validate move has power
        const power = move.power;
        if (power === null || power <= 0) {
          return err(InvalidMove({ reason: `Move "${move.name}" has no power` }));
        }

        // Determine attack/defense stats based on damage class
        const isSpecial = move.damage_class.name === "special";
        const attackStat = isSpecial
          ? getStatValue(attacker, "special-attack")
          : getStatValue(attacker, "attack");
        const defenseStat = isSpecial
          ? getStatValue(defender, "special-defense")
          : getStatValue(defender, "defense");

        // Simplified Gen 1 damage formula:
        // base = ((2 * 50 / 5 + 2) * power * attack / defense / 50 + 2)
        const baseDamage = Math.floor(
          (((2 * 50) / 5 + 2) * power * attackStat) / defenseStat / 50 + 2
        );

        // STAB: 1.5x if attacker type matches move type
        const moveTypeName = move.type.name;
        const attackerTypes = attacker.pokemon.types.map(t => t.type.name);
        const stab = attackerTypes.includes(moveTypeName);
        const stabModifier = stab ? 1.5 : 1;

        // Type effectiveness from type-chart.json
        const defenderTypes = defender.pokemon.types.map(t => t.type.name);
        const rawEffectiveness = typeService.getEffectiveness(moveTypeName, defenderTypes);
        const effectiveness = clampEffectiveness(rawEffectiveness);

        // Random factor (0.85 - 1.0)
        const randomFactor = 0.85 + Math.random() * 0.15;

        // Critical hit multiplier
        const critModifier = isCritical ? 1.5 : 1;

        // Final damage calculation
        const finalDamage = Math.max(
          1,
          Math.floor(baseDamage * stabModifier * effectiveness * randomFactor * critModifier)
        );

        return ok({
          baseDamage,
          stab,
          effectiveness,
          criticalHit: isCritical,
          finalDamage,
          typeModifier: effectiveness,
        });
      },
    };
  },
});

export { damageCalcAdapter };
