import RAPIER from '@dimforge/rapier2d';

export class PhysicsWorld {
  public rawWorld: RAPIER.World;
  private accumulator = 0;
  public readonly fixedDeltaTime = 1 / 60;

  constructor() {
    const gravity = { x: 0.0, y: 0.0 };
    const WorldClass = RAPIER.World || (RAPIER as unknown as { default?: { World?: typeof RAPIER.World } }).default?.World;
    if (!WorldClass) {
      throw new Error('No se pudo inicializar RAPIER.World');
    }
    this.rawWorld = new WorldClass(gravity);
  }

  /**
   * Ejecuta sub-stepping determinista a 60 Hz exactos desacoplado del renderizado
   */
  public step(dt: number, onTick?: (fixedDt: number) => void): void {
    this.accumulator += Math.min(dt, 0.1);
    while (this.accumulator >= this.fixedDeltaTime) {
      if (onTick) {
        onTick(this.fixedDeltaTime);
      }
      this.rawWorld.step();
      this.accumulator -= this.fixedDeltaTime;
    }
  }

  /**
   * Crea un cuerpo rígido dinámico para entidades celulares móviles
   */
  public createDynamicBody(x: number, y: number, linearDamping = 0.2, angularDamping = 1.5): RAPIER.RigidBody {
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y)
      .setLinearDamping(linearDamping)
      .setAngularDamping(angularDamping);
    return this.rawWorld.createRigidBody(desc);
  }

  /**
   * Crea un colisionador de cápsula para bacterias bacilares
   */
  public createCapsuleCollider(radius: number, halfHeight: number, body: RAPIER.RigidBody): RAPIER.Collider {
    const desc = RAPIER.ColliderDesc.capsule(halfHeight, radius)
      .setRestitution(0.4)
      .setFriction(0.2);
    return this.rawWorld.createCollider(desc, body);
  }

  /**
   * Crea un colisionador esférico para cocos o proyectiles
   */
  public createBallCollider(radius: number, body: RAPIER.RigidBody): RAPIER.Collider {
    const desc = RAPIER.ColliderDesc.ball(radius)
      .setRestitution(0.5)
      .setFriction(0.1);
    return this.rawWorld.createCollider(desc, body);
  }
}
