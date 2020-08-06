/* eslint-disable no-param-reassign */
// eslint-disable-next-line import/no-cycle
import Particle from './particle';

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

export default class Fireworks {
  static colors = ['#E8BC2C', '#D0049E', '#02CBFE', '#5723FD', '#FE8C27', '#6CB859'];
  private particlesCount = 60;
  private fallParticlesCount = 30;
  private particles: Particle[] = [];
  private lastUpdateTime = 0;
  private started = false;
  private startedFall = false;

  public speedCoef = 1.0;
  public fallingDownCount = 0;

  constructor(private context: any) {
  }

  getMeasuredHeight() {
    return this.context.canvas.clientHeight;
  }

  getMeasuredWidth() {
    return this.context.canvas.clientWidth;
  }

  createParticle(fall: boolean) {
    const particle = new Particle(this);
    particle.colorType = Fireworks.colors[getRandomInt(0, Fireworks.colors.length)];
    particle.type = getRandomInt(0, 2);
    particle.side = getRandomInt(0, 2);
    particle.finishedStart = 1 + getRandomInt(0, 2);
    if (particle.type === 0) {
      particle.typeSize = 4 + Math.random() * 2;
    } else {
      particle.typeSize = 4 + Math.random() * 4;
    }
    if (fall) {
      particle.y = -Math.random() * this.getMeasuredHeight() * 1.2;
      particle.x = 5 + getRandomInt(0, this.getMeasuredWidth() - 10);
      particle.xFinished = particle.finishedStart;
    } else {
      const xOffset = 4 + getRandomInt(0, 10);
      const yOffset = this.getMeasuredHeight() / 4;
      if (particle.side === 0) {
        particle.x = -xOffset;
      } else {
        particle.x = this.getMeasuredWidth() + xOffset;
      }
      particle.rotation = Math.random() * 360;
      particle.moveX = (particle.side === 0 ? 1 : -1) * (1.2 + Math.random() * 4);
      particle.moveY = -(4 + Math.random() * 4);
      particle.y = yOffset / 2 + getRandomInt(0, yOffset * 2);
    }
    // console.log(`particle side=${particle.side} x=${particle.x} y=${particle.y} moveX=${particle.moveX} moveY=${particle.moveY}`);
    return particle;
  }

  start() {
    if (this.started) {
      return;
    }

    this.particles = [];
    this.started = true;
    this.startedFall = false;
    this.fallingDownCount = 0;
    this.speedCoef = 1.0;
    this.lastUpdateTime = 0;
    for (let a = 0; a < this.particlesCount; a++) {
      this.particles.push(this.createParticle(false));
    }

    this.draw();
  }

  startFall() {
    if (this.startedFall) {
      return;
    }
    this.startedFall = true;
    for (let a = 0; a < this.fallParticlesCount; a++) {
      this.particles.push(this.createParticle(true));
    }
  }

  draw() {
    const newTime = Date.now();
    let dt = newTime - this.lastUpdateTime;
    this.lastUpdateTime = newTime;
    if (dt > 18) {
      dt = 16;
    }
    // console.log('draw dt', dt);
    this.context.clearRect(0, 0, this.getMeasuredWidth(), this.getMeasuredHeight());
    for (let a = 0, N = this.particles.length; a < N; a++) {
      const p = this.particles[a];
      p.draw(this.context);
      if (p.update(dt)) {
        this.particles.splice(a, 1);
        a--;
        N--;
      }
    }
    if (this.fallingDownCount >= this.particlesCount / 2 && this.speedCoef > 0.2) {
      this.startFall();
      this.speedCoef -= (dt / 16.0) * 0.15;
      if (this.speedCoef < 0.2) {
        this.speedCoef = 0.2;
      }
    }
    if (this.particles.length) {
      requestAnimationFrame(() => this.draw());
    } else {
      this.started = false;
      this.context.clearRect(0, 0, this.getMeasuredWidth(), this.getMeasuredHeight());
    }
  }
}
