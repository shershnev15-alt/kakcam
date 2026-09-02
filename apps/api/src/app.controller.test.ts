import { describe, expect, it, vi } from 'vitest';
import { AppController } from './app.controller';
import type { DatabaseService } from './database.service';

describe('AppController', () => {
  const database = { ping: vi.fn().mockResolvedValue(true) } as unknown as DatabaseService;
  const controller = new AppController(database);

  it('reports liveness without requiring dependencies', () => {
    expect(controller.health()).toMatchObject({ status: 'ok', service: 'arena-api' });
  });

  it('exposes the complete demo catalog counts', () => {
    const response = controller.index();
    expect(response.counts).toEqual({
      players: 40,
      teams: 8,
      tournaments: 3,
      matches: 30,
      achievements: 20,
    });
  });

  it('reports database readiness', async () => {
    await expect(controller.ready()).resolves.toMatchObject({ status: 'ready' });
  });
});
