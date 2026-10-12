(function (root) {
  'use strict';
  class SnakeEngine {
    constructor(size = 30, random = Math.random) {
      this.size = size;
      this.random = random;
      this.snake = [{ x: Math.floor(size / 2), y: Math.floor(size / 2) }];
      this.direction = { x: 1, y: 0 };
      this.pending = null;
      this.score = 0;
      this.over = false;
      this.placeFood();
    }
    placeFood() {
      const empty = [];
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          if (!this.snake.some(p => p.x === x && p.y === y)) empty.push({ x, y });
        }
      }
      this.food = empty.length ? empty[Math.floor(this.random() * empty.length)] : null;
      if (!this.food) this.over = true;
    }
    turn(x, y) {
      if (this.over || this.pending || Math.abs(x) + Math.abs(y) !== 1) return false;
      if (x === -this.direction.x && y === -this.direction.y) return false;
      if (x === this.direction.x && y === this.direction.y) return false;
      this.pending = { x, y };
      return true;
    }
    step() {
      if (this.over) return;
      if (this.pending) this.direction = this.pending;
      this.pending = null;
      const head = { x: this.snake[0].x + this.direction.x, y: this.snake[0].y + this.direction.y };
      const eating = this.food && head.x === this.food.x && head.y === this.food.y;
      const body = eating ? this.snake : this.snake.slice(0, -1);
      if (head.x < 0 || head.y < 0 || head.x >= this.size || head.y >= this.size || body.some(p => p.x === head.x && p.y === head.y)) {
        this.over = true;
        return;
      }
      this.snake.unshift(head);
      if (eating) {
        this.score += 10;
        this.placeFood();
      } else this.snake.pop();
    }
  }
  root.SnakeEngine = SnakeEngine;
  if (typeof module !== 'undefined') module.exports = SnakeEngine;
})(typeof window !== 'undefined' ? window : globalThis);
