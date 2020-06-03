/* eslint-disable no-param-reassign */
import Fireworks from './fireforks';

type Radius = { tl: number, tr: number, br: number, bl: number } | number;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: Radius,
  fill: boolean,
  stroke: boolean) {
  if (typeof stroke === 'undefined') {
    stroke = true;
  }
  if (typeof radius === 'undefined') {
    radius = 5;
  }
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    radius.tl = radius.tl ?? 0;
    radius.tr = radius.tr ?? 0;
    radius.br = radius.br ?? 0;
    radius.bl = radius.bl ?? 0;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

export default class Particle {
  type = 0;
  colorType = '';
  side = 0;
  typeSize = 4;
  xFinished = 0;
  finishedStart = 0;

  x = 0;
  y = 0;
  rotation = 0;
  moveX = 0;
  moveY = 0;

  constructor(private fireworks: Fireworks) { }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.colorType;

    if (this.type === 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.typeSize, 0, Math.PI * 2, false);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      roundRect(ctx, -this.typeSize, -2, this.typeSize * 2, 4, 2, true, false);
      ctx.restore();
    }
  }

  update(dt: number) {
    const moveCoef = dt / 16.0;
    this.x += this.moveX * moveCoef;
    this.y += this.moveY * moveCoef;
    if (this.xFinished !== 0) {
      const dp = 0.5;
      if (this.xFinished === 1) {
        this.moveX += dp * moveCoef * 0.05;
        if (this.moveX >= dp) {
          this.xFinished = 2;
        }
      } else {
        this.moveX -= dp * moveCoef * 0.05;
        if (this.moveX <= -dp) {
          this.xFinished = 1;
        }
      }
    } else if (this.side === 0) {
      if (this.moveX > 0) {
        this.moveX -= moveCoef * 0.05;
        if (this.moveX <= 0) {
          this.moveX = 0;
          this.xFinished = this.finishedStart;
        }
      }
    } else if (this.moveX < 0) {
      this.moveX += moveCoef * 0.05;
      if (this.moveX >= 0) {
        this.moveX = 0;
        this.xFinished = this.finishedStart;
      }
    }
    const yEdge = -0.5;
    const wasNegative = this.moveY < yEdge;
    if (this.moveY > yEdge) {
      this.moveY += (1.0 / 3.0) * moveCoef * this.fireworks.speedCoef;
    } else {
      this.moveY += (1.0 / 3.0) * moveCoef;
    }
    if (wasNegative && this.moveY > yEdge) {
      this.fireworks.fallingDownCount++;
    }
    if (this.type === 1) {
      this.rotation += moveCoef * 10;
      if (this.rotation > 360) {
        this.rotation -= 360;
      }
    }

    return this.y >= this.fireworks.getMeasuredHeight();
  }
}
