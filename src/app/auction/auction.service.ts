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
export type CurrentStatus = 'idle' | 'bidding' | 'settling' | 'sold' | 'unsold';

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
  value: number;
}

/** The most recent completed sale, for the smart-auction verdict banner. */
export interface LastSale {
  name: string;
  club: string;
  price: number;
  value: number;
  teamName: string;
}

export interface CurrentLot {
  playerId: string | null;
  bid: number;
  leaderId: string | null;
  leaderName: string | null;
  status: CurrentStatus;
  /** Teams that have bowed out of the current player. */
  passed?: Record<string, true>;
  /** Epoch ms when this lot auto-finishes (absent/null = no timer). */
  endsAt?: number | null;
}

export interface RoomConfig {
  budget: number;
  squadSize: number;
  minBid: number;
  /** Seconds per lot before it auto-finishes; 0 = no timer. */
  timer: number;
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
  lastSale?: LastSale;
  /**
   * Per-team pitch arrangement: chosen formation, player order (starters
   * first), and optional free-move position overrides (x/y as % of pitch).
   */
  lineups?: Record<
    string,
    { formation: string; order: string[]; pos?: Record<string, { x: number; y: number }> }
  >;
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
      current: {
        playerId: null,
        bid: 0,
        leaderId: null,
        leaderName: null,
        status: 'idle',
        passed: {},
      },
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

    // Finish when the pool runs out OR every team's squad is full — otherwise
    // we'd keep drawing players nobody can buy.
    const teams = Object.values(room.teams ?? {});
    const allSquadsFull = teams.length > 0 && teams.every((t) => this.slotsLeft(room, t.id) <= 0);

    if (pool.length === 0 || allSquadsFull) {
      await update(this.roomRef(code), {
        status: 'done',
        current: {
          playerId: null,
          bid: 0,
          leaderId: null,
          leaderName: null,
          status: 'idle',
          passed: {},
        },
      });
      return;
    }
    const next = pool[Math.floor(Math.random() * pool.length)];
    const endsAt = room.config.timer > 0 ? Date.now() + room.config.timer * 1000 : null;
    await update(this.roomRef(code), {
      current: {
        playerId: next.id,
        bid: room.config.minBid,
        leaderId: null,
        leaderName: null,
        status: 'bidding',
        passed: {},
        endsAt,
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
        value: player.value,
      },
      lastSale: {
        name: player.name,
        club: player.club,
        price: cur.bid,
        value: player.value,
        teamName: team.name,
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
      // Can't bid if you've passed, can't bid against yourself, and must stay
      // within your spending cap.
      if (cur.passed?.[teamId] || cur.leaderId === teamId || newBid > maxBid) return cur;
      const timer = room.config.timer;
      const endsAt = timer > 0 ? Date.now() + timer * 1000 : (cur.endsAt ?? null);
      return { ...cur, bid: newBid, leaderId: teamId, leaderName: team.name, endsAt };
    });
  }

  /**
   * A team bows out of the current player. When everyone but one team has
   * passed, that team wins automatically — at the leading bid if there was
   * one, otherwise at the base (minimum) price. If everyone passes, the
   * player goes unsold and the next is drawn.
   */
  async pass(code: string, teamId: string): Promise<void> {
    const room = this.room();
    if (!room) return;
    const cur = room.current;
    if (cur.status !== 'bidding' || !cur.playerId) return;
    if (cur.leaderId === teamId) return; // can't pass while you're winning
    await update(ref(this.db, `rooms/${code}/current/passed`), { [teamId]: true });
    await this.resolveIfSettled(code);
  }

  /** Settle the lot if the passes have left at most one team still bidding. */
  private async resolveIfSettled(code: string) {
    const snap = await get(this.roomRef(code));
    if (!snap.exists()) return;
    const room = snap.val() as Room;
    const cur = room.current;
    if (cur.status !== 'bidding' || !cur.playerId) return;

    const passed = cur.passed ?? {};
    // A team is still "in" only if it hasn't passed and still has a squad slot.
    const active = Object.values(room.teams ?? {}).filter(
      (t) => !passed[t.id] && this.slotsLeft(room, t.id) > 0,
    );
    if (active.length > 1) return; // still bidding

    // Atomically claim the right to settle this lot so two near-simultaneous
    // passes can't both award it (which would double-charge the winner).
    const token = randomId();
    const curRef = ref(this.db, `rooms/${code}/current`);
    const txn = await runTransaction(curRef, (c: (CurrentLot & { settlerId?: string }) | null) => {
      if (!c || c.status !== 'bidding') return c;
      return { ...c, status: 'settling', settlerId: token };
    });
    const claimed =
      txn.committed && (txn.snapshot.val() as { settlerId?: string } | null)?.settlerId === token;
    if (!claimed) return;

    const playerId = cur.playerId;
    if (active.length === 0) {
      // Nobody wanted him — unsold, move on.
      await update(this.roomRef(code), { [`drawn/${playerId}`]: true });
      await this.drawNext(code);
      return;
    }

    const winner = active[0];
    // Leading bid if there was one, otherwise the base price.
    const price = cur.leaderId ? cur.bid : room.config.minBid;
    const player = PLAYERS.find((p) => p.id === playerId)!;
    await update(this.roomRef(code), {
      [`drawn/${playerId}`]: true,
      [`teams/${winner.id}/budget`]: winner.budget - price,
      [`squads/${winner.id}/${player.id}`]: {
        name: player.name,
        club: player.club,
        position: player.position,
        price,
        value: player.value,
      },
      lastSale: {
        name: player.name,
        club: player.club,
        price,
        value: player.value,
        teamName: winner.name,
      },
    });
    await this.drawNext(code);
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

  /** Whether a team has bowed out of the current player. */
  hasPassed(room: Room, teamId: string): boolean {
    return !!room.current.passed?.[teamId];
  }

  /** How many teams are still bidding on the current player. */
  activeCount(room: Room): number {
    const passed = room.current.passed ?? {};
    return Object.values(room.teams ?? {}).filter(
      (t) => !passed[t.id] && this.slotsLeft(room, t.id) > 0,
    ).length;
  }

  /**
   * Smart-auction verdict comparing price paid to market value.
   * `kind` drives the colour styling; `label` is the badge text.
   */
  verdict(price: number, value: number): { label: string; kind: string } {
    const ratio = value > 0 ? price / value : 1;
    if (ratio <= 0.6) return { label: '🟢 GREAT STEAL', kind: 'steal' };
    if (ratio <= 0.85) return { label: '🟢 Good deal', kind: 'good' };
    if (ratio < 1.25) return { label: '🟡 Fair price', kind: 'fair' };
    if (ratio < 1.75) return { label: '🔴 Overpaid', kind: 'over' };
    return { label: '🔴 MASSIVE overpay', kind: 'over2' };
  }

  player(id: string | null): Player | undefined {
    return id ? PLAYERS.find((p) => p.id === id) : undefined;
  }

  /** Total number of players in the auction pool. */
  poolSize(): number {
    return PLAYERS.length;
  }

  /**
   * Save a team's formation + player order. Writes only those keys so custom
   * drag positions survive; pass `resetPos` to clear them (e.g. on a formation
   * change, so the new shape lays out fresh).
   */
  async saveLineup(
    code: string,
    teamId: string,
    formation: string,
    order: string[],
    resetPos = false,
  ) {
    const upd: Record<string, unknown> = {
      [`lineups/${teamId}/formation`]: formation,
      [`lineups/${teamId}/order`]: order,
    };
    if (resetPos) upd[`lineups/${teamId}/pos`] = null;
    await update(this.roomRef(code), upd);
  }

  /** Save a single player's free-move position (x/y as % of the pitch). */
  async savePos(code: string, teamId: string, id: string, x: number, y: number) {
    await update(this.roomRef(code), { [`lineups/${teamId}/pos/${id}`]: { x, y } });
  }
}
