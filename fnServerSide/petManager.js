import { ENEMY_TYPES } from "../types/enemyTypes.js";
import Pet from "../entities/Pet.js";

export default class PetManager {
  constructor(player, context) {
    this.player = player;
    this.context = context;
    this.pets = [];
    this.maxSlots = 3;
    this.loadPets();
    // this.scene.eventBus.on("enemy_killed", (data) => { // EVENT BUS precisa escutar servidor
    //   this.recoverPet(data);
    // });
  }

  savePets() {
    const pets = this.pets.map((pet) => {
      return {
        name: pet.config.renderName,
        lives: pet.lives,
        health: pet.health,
        uid: pet.uid,
        isBoss: pet.isBoss,
        state: pet.state,
      };
    });
    this.player.pets = pets;
  }

  loadPet(NewPet, transform = false) {
    const player = this.player;
    const name = NewPet.name;

    const enemyType = ENEMY_TYPES[name];
    const config = {
      owner: player,
      isBoss: NewPet.isBoss,
    };

    Object.assign(config, enemyType);
    // if (NewPet.isBoss) Object.assign(config, enemyType.boss);

    const pet = new Pet(
      {
        x: player.position.x + 75 * Math.random(),
        y: player.position.y + 75 * Math.random(),
      },
      config,
    );
    pet.health = transform ? enemyType.health : NewPet.health;
    pet.lives = transform ? 3 : NewPet.lives;
    pet.uid = transform ? crypto.randomUUID() : NewPet.uid;
    pet.state = transform ? "idle" : NewPet.health <= 0 ? "down" : NewPet.state;
    pet.PetManager = this;
    this.addPet(pet);
  }

  loadPets() {
    const player = this.player;
    const pets = player.pets ?? [];

    pets.forEach((NewPet) => {
      this.loadPet(NewPet);
    });
  }

  recoverPet(amount) {
    const pet = this.pets.find((p) => p.state === "down");
    if (pet) pet.recover(amount);

    this.savePets();
  }

  hasFreeSlot() {
    return this.pets.length < this.maxSlots;
  }

  addPet(pet) {
    pet.followOffset.x = this.pets.length > 0 ? 25 : pet.followOffset.x;
    pet.followOffset.y = this.pets.length > 1 ? 50 : pet.followOffset.y;

    if (this.hasFreeSlot) {
      this.pets.push(pet);
      pet.dropEnabled = false;
    }

    this.savePets();
  }

  removePet(pet) {
    this.pets = this.pets.filter((p) => p !== pet);
    this.savePets();
  }

  update(delta) {
    for (const pet of this.pets) {
      pet.update(delta);
    }
  }
}
