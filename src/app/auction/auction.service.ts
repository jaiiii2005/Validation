import { Injectable, signal } from '@angular/core';
import {
  ref,
  get,
  set,
  update,
  onValue,
  off,
  runTransaction,
  serverTimestamp,
  type Database,
} from 'firebase/database';
import { getDb } from '../firebase';
import { PLAYERS, type Player, type Position } from './players';

export type RoomStatus = 'lobby' | 'live' | 'done';
export type CurrentStatus = 'idle' | 'bidding' | 'sold' | 'unsold';

export interface Team {
  id: string;
  name: string;
  budget: number;
  joinedAt: number;
}

export interface SquadEntry {
  name: string;
  club: string;
  position: Position;
  price: number;
}

export interface CurrentLot {
  playerId: string | null;
  bid: number;
  leaderId: string | null;
  leaderName: string | null;
  status: CurrentStatus;
}

export interface RoomConfig {
  budget: number;
  squadSize: number;
  minBid: number;
}

export interface Room {
  code: string;
  status: RoomStatus;
  hostId: string;
  config: RoomConfig;
  teams: Record<string, Team>;
  drawn: Record<string, true>;
  squads: Record<string, Record<string, SquadEntry>>;
  current: CurrentLot;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no easily-confused chars
const randomCode = (n = 4) =>
  Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(
    '',
  );
const randomId = () => Math.random().toString(36).slice(2, 10);

@Injectable({ providedIn: 'root' })
export class AuctionService {
  private db: Database = getDb();

  /** Live snapshot of the joined room, kept in sync with Realtime Database. */
  readonly room = signal<Room | null>(null);
  /** This device's team id within the room. */
  readonly myTeamId = signal<string | null>(null);

  private currentCode: string | null = null;

  private roomRef(code: string) {
    return ref(this.db, `rooms/${code}`);
  }

  /** Create a new room, register the host's team, and join it. */
  async createRoom(teamName: string, config: RoomConfig): Promise<string> {
    let code = randomCode();
    // Avoid colliding with an existing room.
    while ((await get(this.roomRef(code))).exists()) code = randomCode();

    const teamId = randomId();
    const room: Room = {
      code,
      status: 'lobby',
      hostId: teamId,
      config,
      teams: {
        [teamId]: { id: teamId, name: teamName, budget: config.budget, joinedAt: Date.now() },
      },
      drawn: {},
      squads: { [teamId]: {} },
      current: { playerId: null, bid: 0, leaderId: null, leaderName: null, status: 'idle' },
    };
    await set(this.roomRef(code), { ...room, createdAt: serverTimestamp() });
    this.myTeamId.set(teamId);
    this.subscribe(code);
    return code;
  }

  /** Join an existing room with a team name. Returns the new team id. */
  async joinRoom(code: string, teamName: string): Promise<string> {
    code = code.toUpperCase().trim();
    const snap = await get(this.roomRef(code));
    if (!snap.exists()) throw new Error(`No auction room "${code}" found.`);
    const room = snap.val() as Room;

    const teamId = randomId();
    await update(this.roomRef(code), {
      [`teams/${teamId}`]: {
        id: teamId,
        name: teamName,
        budget: room.config.budget,
        joinedAt: Date.now(),
      },
      [`squads/${teamId}`]: {},
    });
    this.myTeamId.set(teamId);
    this.subscribe(code);
    return code;
  }

  /** Re-attach to a room (e.g. after refresh) using a remembered team id. */
  rejoin(code: string, teamId: string) {
    this.myTeamId.set(teamId);
    this.subscribe(code);
  }

  private subscribe(code: string) {
    if (this.currentCode && this.currentCode !== code) {
      off(this.roomRef(this.currentCode));
    }
    this.currentCode = code;
    onValue(this.roomRef(code), (snap) => {
      this.room.set(snap.exists() ? (snap.val() as Room) : null);
    });
  }

  // ── Auction control (host) ────────────────────────────────────────────

  async startAuction(code: string) {
    await update(this.roomRef(code), { status: 'live' });
    await this.drawNext(code);
  }

  /** Pick a random not-yet-drawn player and put them up for bidding. */
  async drawNext(code: string) {
    const snap = await get(this.roomRef(code));
    if (!snap.exists()) return;
    const room = snap.val() as Room;
    const drawn = room.drawn ?? {};
    const pool = PLAYERS.filter((p) => !drawn[p.id]);

    if (pool.length === 0) {
      await update(this.roomRef(code), {
        status: 'done',
        current: { playerId: null, bid: 0, leaderId: null, leaderName: null, status: 'idle' },
      });
      return;
    }
    const next = pool[Math.floor(Math.random() * pool.length)];
    await update(this.roomRef(code), {
      current: {
        playerId: next.id,
        bid: room.config.minBid,
        leaderId: null,
        leaderName: null,
        status: 'bidding',
      },
    });
  }

  /** Award the current lot to the leading team, deduct budget, then draw next. */
  async sell(code: string) {
    const snap = await get(this.roomRef(code));
    if (!snap.exists()) return;
    const room = snap.val() as Room;
    const cur = room.current;
    if (cur.status !== 'bidding' || !cur.playerId) return;

    // No bids → mark unsold and move on.
    if (!cur.leaderId) {
      await update(this.roomRef(code), {
        [`drawn/${cur.playerId}`]: true,
      });
      await this.drawNext(code);
      return;
    }

    const player = PLAYERS.find((p) => p.id === cur.playerId)!;
    const team = room.teams[cur.leaderId];
    await update(this.roomRef(code), {
      [`drawn/${cur.playerId}`]: true,
      [`teams/${cur.leaderId}/budget`]: team.budget - cur.bid,
      [`squads/${cur.leaderId}/${player.id}`]: {
        name: player.name,
        club: player.club,
        position: player.position,
        price: cur.bid,
      },
    });
    await this.drawNext(code);
  }

  /** Skip the current player with no sale. */
  async skip(code: string) {
    const snap = await get(this.roomRef(code));
    if (!snap.exists()) return;
    const room = snap.val() as Room;
    if (room.current.playerId) {
      await update(this.roomRef(code), { [`drawn/${room.current.playerId}`]: true });
    }
    await this.drawNext(code);
  }

  // ── Bidding (any team) ────────────────────────────────────────────────

  /**
   * Place a bid for a team, raising the current price by `increment`.
   * Uses a transaction on the `current` node so simultaneous bids from
   * different phones resolve cleanly (highest wins, no lost updates).
   */
  async placeBid(code: string, teamId: string, increment: number): Promise<void> {
    const room = this.room();
    if (!room) return;
    const team = room.teams?.[teamId];
    if (!team) return;

    const maxBid = this.maxBidFor(room, teamId);
    const curRef = ref(this.db, `rooms/${code}/current`);
    await runTransaction(curRef, (cur: CurrentLot | null) => {
      if (!cur || cur.status !== 'bidding' || !cur.playerId) return cur;
      const newBid = (cur.bid ?? 0) + increment;
      // Leader can't bid against themselves; respect the team's spending cap.
      if (cur.leaderId === teamId || newBid > maxBid) return cur;
      return { ...cur, bid: newBid, leaderId: teamId, leaderName: team.name };
    });
  }

  // ── Derived helpers ───────────────────────────────────────────────────

  /** Players already bought by a team. */
  squadOf(room: Room, teamId: string): SquadEntry[] {
    return Object.values(room.squads?.[teamId] ?? {});
  }

  /** How many squad slots a team still has open. */
  slotsLeft(room: Room, teamId: string): number {
    return room.config.squadSize - this.squadOf(room, teamId).length;
  }

  /**
   * Most a team may bid right now: their budget, minus enough to still afford
   * the minimum bid on every other slot they must fill. Prevents soft-locking
   * a squad you can no longer complete.
   */
  maxBidFor(room: Room, teamId: string): number {
    const team = room.teams[teamId];
    const slots = this.slotsLeft(room, teamId);
    if (slots <= 0) return 0;
    const reserve = (slots - 1) * room.config.minBid;
    return Math.max(0, team.budget - reserve);
  }

  player(id: string | null): Player | undefined {
    return id ? PLAYERS.find((p) => p.id === id) : undefined;
  }

  /** Total number of players in the auction pool. */
  poolSize(): number {
    return PLAYERS.length;
  }
}
