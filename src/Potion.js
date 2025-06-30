import * as THREE from 'three';

/**
 * A single-use consumable buff.
 * Only *one* Potion may be active at any moment – any further attempts to drink
 * while a buff is running are ignored (the player gets a little popup message).
*/
export class Potion {
    static COST_MANA = 70;             // mana needed to drink
    static DURATION  = 8;              // seconds – affects *both* buffs
    static KNIFE_MULT = 4;             // × attack‑speed
    static MOVE_MULT  = 1.5;           // × run‑speed

    /**
     * Public helper exposed to the rest of the game.  It performs all the
     * safety‑checks and, when successful, registers a *single* active Potion
     * instance on the `game` object (game._activePotion).
     */
    static tryConsume(game) {
        
        const { player, ui } = game;

        // already under a buff? – bail out
        if (game._activePotion){
            ui.showFloatingMessage("🧪 Already under potion effect!", player.mesh.position.clone());
            return;
        }

        // have a flask?
        if (game.potionTokens <= 0) return;

        // enough mana?
        if (!player.spendMana(Potion.COST_MANA)) {
            ui.showFloatingMessage("Not enough mana!", player.mesh.position.clone());
            return;
        }

        // consume the flask & spawn the buff instance
        game.potionTokens--;
        ui.updatePotionCount(game.potionTokens);

        game._activePotion = new Potion(game);
        ui.showFloatingMessage("🧪 Potion consumed!", player.mesh.position.clone());
    }

    /* ------------------------------------------------------------ */
    constructor(game) {
        
        this.game = game;
        this.timeLeft = Potion.DURATION;

        // Apply the two buffs.  The Player class is expected to expose helper
        // methods that stack/un‑stack temporary multipliers; if not, adapt these.
        game.player.addTempModifier?.('knifeSpeed', Potion.KNIFE_MULT);
        game.player.addTempModifier?.('moveSpeed',  Potion.MOVE_MULT);
    }

    /**
     * Advances the internal timer.  Returns *true* when the buff has expired so
     * the caller can clean it up easily:  if (potion.update(dt)) active=false;
     */
    update(dt) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0){
            this.dispose();
            return true;
        }
        return false;
    }

    /**
     * Reverts any stat changes and deregisters itself from `game`.
     */
        dispose(){
        this.game.player.removeTempModifier?.('knifeSpeed', Potion.KNIFE_MULT);
        this.game.player.removeTempModifier?.('moveSpeed',  Potion.MOVE_MULT);
        this.game._activePotion = null;
    }
}
