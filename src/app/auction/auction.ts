import { Component, computed, effect, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuctionService, type SquadEntry } from './auction.service';
import { POSITION_LABEL, type Position } from './players';
import { getPlayerPhoto } from './photos';
import { isFirebaseConfigured } from '../firebase-config';

const STORE_KEY = 'football-auction';
const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'ATT'];

// Each formation = outfield lines from defence → attack (GK implied). Every
// entry sums to 10 outfield players (+1 GK = a starting XI).
const FORMATIONS: Record<string, number[]> = {
  '4-3-3': [4, 3, 3],
  '4-4-2': [4, 4, 2],
  '4-2-3-1': [4, 2, 3, 1],
  '4-5-1': [4, 5, 1],
  '4-1-4-1': [4, 1, 4, 1],
  '4-4-1-1': [4, 4, 1, 1],
  '4-3-2-1': [4, 3, 2, 1],
  '4-2-2-2': [4, 2, 2, 2],
  '3-4-3': [3, 4, 3],
  '3-5-2': [3, 5, 2],
  '3-4-2-1': [3, 4, 2, 1],
  '3-1-4-2': [3, 1, 4, 2],
  '3-2-4-1': [3, 2, 4, 1],
  '5-3-2': [5, 3, 2],
  '5-4-1': [5, 4, 1],
  '5-2-3': [5, 2, 3],
};
const FORMATION_KEYS = Object.keys(FORMATIONS);
const POS_RANK: Record<Position, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

interface Slot {
  id: string;
  entry: SquadEntry;
}

@Component({
  selector: 'app-auction',
  imports: [CommonModule, FormsModule],
  templateUrl: './auction.html',
  styleUrl: './auction.css',
})
export class Auction implements OnInit {
  private svc = inject(AuctionService);

  readonly configured = isFirebaseConfigured();
  readonly positions = POSITIONS;
  readonly positionLabel = POSITION_LABEL;

  // Lobby form state
  createName = '';
  joinName = '';
  joinCode = '';
  budget = 200;
  squadSize = 18;
  minBid = 1;
  error = signal('');
  busy = signal(false);

  // Live state from the service
  readonly room = this.svc.room;
  readonly myTeamId = this.svc.myTeamId;

  readonly teams = computed(() => {
    const r = this.room();
    if (!r) return [];
    return Object.values(r.teams ?? {}).sort((a, b) => a.joinedAt - b.joinedAt);
  });

  readonly isHost = computed(() => {
    const r = this.room();
    return !!r && r.hostId === this.myTeamId();
  });

  readonly myTeam = computed(() => {
    const r = this.room();
    const id = this.myTeamId();
    return r && id ? r.teams?.[id] : undefined;
  });

  readonly currentPlayer = computed(() => this.svc.player(this.room()?.current.playerId ?? null));

  readonly myMaxBid = computed(() => {
    const r = this.room();
    const id = this.myTeamId();
    return r && id ? this.svc.maxBidFor(r, id) : 0;
  });

  readonly mySlotsLeft = computed(() => {
    const r = this.room();
    const id = this.myTeamId();
    return r && id ? this.svc.slotsLeft(r, id) : 0;
  });

  readonly remainingCount = computed(() => {
    const r = this.room();
    if (!r) return 0;
    const drawn = r.drawn ?? {};
    // Total pool size is fixed; count what hasn't been drawn yet.
    return this.svc.poolSize() - Object.keys(drawn).length;
  });

  /** Most expensive players sold so far (top 6), across all teams. */
  readonly topSigned = computed(() => {
    const r = this.room();
    if (!r) return [];
    const all: { name: string; club: string; price: number; value: number; team: string }[] = [];
    for (const t of Object.values(r.teams ?? {})) {
      for (const e of Object.values(r.squads?.[t.id] ?? {})) {
        all.push({ name: e.name, club: e.club, price: e.price, value: e.value, team: t.name });
      }
    }
    return all.sort((a, b) => b.price - a.price).slice(0, 6);
  });

  /** The most recent completed sale, for the verdict banner. */
  readonly lastSale = computed(() => this.room()?.lastSale);

  /** Photo of the player currently up for auction (null → show placeholder). */
  readonly photoUrl = signal<string | null>(null);

  /** name → photo URL (or null) for every player, used by the pitch view. */
  readonly photoMap = signal<Record<string, string | null>>({});
  private requested = new Set<string>();

  // Pitch / lineup view.
  readonly formationKeys = FORMATION_KEYS;
  /** Currently picked player (for tap-to-swap), scoped to a team. */
  readonly selected = signal<{ teamId: string; id: string } | null>(null);

  constructor() {
    // Whenever a new player comes up, fetch their photo (with a guard so a
    // slow response for a previous player can't overwrite the current one).
    effect(() => {
      const p = this.currentPlayer();
      this.photoUrl.set(null);
      if (!p) return;
      getPlayerPhoto(p.name).then((url) => {
        if (this.currentPlayer()?.id === p.id) this.photoUrl.set(url);
      });
    });

    // Prefetch photos for every sold player so the pitch view has faces ready.
    effect(() => {
      const r = this.room();
      if (!r) return;
      for (const t of Object.values(r.teams ?? {})) {
        for (const e of Object.values(r.squads?.[t.id] ?? {})) this.ensurePhoto(e.name);
      }
    });
  }

  private ensurePhoto(name: string) {
    if (this.requested.has(name)) return;
    this.requested.add(name);
    getPlayerPhoto(name).then((url) => this.photoMap.update((m) => ({ ...m, [name]: url })));
  }

  ngOnInit() {
    const saved = this.readStore();
    if (saved) this.svc.rejoin(saved.code, saved.teamId);
  }

  // ── Lobby actions ───────────────────────────────────────────────────

  async create() {
    if (!this.createName.trim()) return this.error.set('Enter a team name first.');
    this.error.set('');
    this.busy.set(true);
    try {
      const code = await this.svc.createRoom(this.createName.trim(), {
        budget: this.budget,
        squadSize: this.squadSize,
        minBid: this.minBid,
      });
      this.persist(code);
    } catch (e) {
      this.error.set(this.msg(e));
    } finally {
      this.busy.set(false);
    }
  }

  async join() {
    if (!this.joinCode.trim()) return this.error.set('Enter the room code.');
    if (!this.joinName.trim()) return this.error.set('Enter a team name.');
    this.error.set('');
    this.busy.set(true);
    try {
      const code = await this.svc.joinRoom(this.joinCode, this.joinName.trim());
      this.persist(code);
    } catch (e) {
      this.error.set(this.msg(e));
    } finally {
      this.busy.set(false);
    }
  }

  leave() {
    localStorage.removeItem(STORE_KEY);
    location.reload();
  }

  // ── Auction actions ─────────────────────────────────────────────────

  start() {
    const r = this.room();
    if (r) this.svc.startAuction(r.code);
  }

  bid(inc: number) {
    const r = this.room();
    const id = this.myTeamId();
    if (r && id) this.svc.placeBid(r.code, id, inc);
  }

  sell() {
    const r = this.room();
    if (r) this.svc.sell(r.code);
  }

  skip() {
    const r = this.room();
    if (r) this.svc.skip(r.code);
  }

  pass() {
    const r = this.room();
    const id = this.myTeamId();
    if (r && id) this.svc.pass(r.code, id);
  }

  // ── Helpers used by the template ────────────────────────────────────

  squadOf(teamId: string) {
    const r = this.room();
    return r ? this.svc.squadOf(r, teamId) : [];
  }

  squadByPosition(teamId: string, pos: Position) {
    return this.squadOf(teamId).filter((p) => p.position === pos);
  }

  spent(teamId: string) {
    return this.squadOf(teamId).reduce((sum, p) => sum + p.price, 0);
  }

  amLeading() {
    return this.room()?.current.leaderId === this.myTeamId();
  }

  iPassed() {
    const r = this.room();
    const id = this.myTeamId();
    return !!(r && id && this.svc.hasPassed(r, id));
  }

  teamPassed(teamId: string) {
    const r = this.room();
    return !!(r && this.svc.hasPassed(r, teamId));
  }

  activeCount() {
    const r = this.room();
    return r ? this.svc.activeCount(r) : 0;
  }

  verdict(price: number, value: number) {
    return this.svc.verdict(price, value);
  }

  formationFor(teamId: string): string {
    return this.room()?.lineups?.[teamId]?.formation ?? '4-3-3';
  }

  private squadMap(teamId: string): Record<string, SquadEntry> {
    return this.room()?.squads?.[teamId] ?? {};
  }

  /** Player ids for a team, starters-first, honouring any saved arrangement. */
  orderFor(teamId: string): string[] {
    const map = this.squadMap(teamId);
    const valid = Object.keys(map);
    // Default order: by position (GK→ATT), then most valuable first.
    const def = [...valid].sort((a, b) => {
      const r = POS_RANK[map[a].position] - POS_RANK[map[b].position];
      return r !== 0 ? r : map[b].value - map[a].value;
    });
    const stored = this.room()?.lineups?.[teamId]?.order;
    if (!stored) return def;
    // Keep saved order, drop stale ids, append any new ones.
    const order = stored.filter((id) => valid.includes(id));
    for (const id of def) if (!order.includes(id)) order.push(id);
    return order;
  }

  /** Pitch rows top→bottom (ATT … GK); empty slots are null. */
  pitchRows(teamId: string): (Slot | null)[][] {
    const map = this.squadMap(teamId);
    const order = this.orderFor(teamId);
    const lines = FORMATIONS[this.formationFor(teamId)] ?? FORMATIONS['4-3-3'];
    const counts = [1, ...lines]; // GK → ATT
    const rows: (Slot | null)[][] = [];
    let i = 0;
    for (const c of counts) {
      const row: (Slot | null)[] = [];
      for (let k = 0; k < c; k++) {
        const id = order[i++];
        const entry = id ? map[id] : undefined;
        row.push(entry ? { id, entry } : null);
      }
      rows.push(row);
    }
    return rows.reverse(); // attack on top, GK at the bottom
  }

  /** Subs = players beyond the 11 starting slots. */
  benchOf(teamId: string): Slot[] {
    const map = this.squadMap(teamId);
    return this.orderFor(teamId)
      .slice(11)
      .map((id) => ({ id, entry: map[id] }))
      .filter((s): s is Slot => !!s.entry);
  }

  isSelected(teamId: string, id: string | null): boolean {
    const s = this.selected();
    return !!s && !!id && s.teamId === teamId && s.id === id;
  }

  /** Tap a player to pick him; tap another on the same team to swap spots. */
  tapPlayer(teamId: string, id: string | null) {
    if (!id) return;
    const s = this.selected();
    if (!s || s.teamId !== teamId) {
      this.selected.set({ teamId, id });
      return;
    }
    if (s.id === id) {
      this.selected.set(null); // tap again to deselect
      return;
    }
    this.swap(teamId, s.id, id);
    this.selected.set(null);
  }

  private swap(teamId: string, idA: string, idB: string) {
    const order = [...this.orderFor(teamId)];
    const ia = order.indexOf(idA);
    const ib = order.indexOf(idB);
    if (ia < 0 || ib < 0 || ia === ib) return;
    [order[ia], order[ib]] = [order[ib], order[ia]];
    const code = this.room()?.code;
    if (code) this.svc.saveLineup(code, teamId, this.formationFor(teamId), order);
  }

  changeFormation(teamId: string, f: string) {
    const code = this.room()?.code;
    if (code) this.svc.saveLineup(code, teamId, f, this.orderFor(teamId));
  }

  photo(name: string): string | null {
    return this.photoMap()[name] ?? null;
  }

  /** Surname (or single name) for compact slot labels. */
  shortName(name: string): string {
    const parts = name.trim().split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : name;
  }

  private persist(code: string) {
    const id = this.myTeamId();
    if (id) localStorage.setItem(STORE_KEY, JSON.stringify({ code, teamId: id }));
  }

  private readStore(): { code: string; teamId: string } | null {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private msg(e: unknown): string {
    return e instanceof Error ? e.message : 'Something went wrong. Check your Firebase config.';
  }
}
