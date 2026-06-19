import { Component, computed, effect, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuctionService, type SquadEntry } from './auction.service';
import { POSITION_LABEL, type Position } from './players';
import { getPlayerPhoto } from './photos';
import { isFirebaseConfigured } from '../firebase-config';

const STORE_KEY = 'football-auction';
const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'ATT'];

type Formation = '4-3-3' | '4-4-2' | '3-5-2';
const FORMATIONS: Record<Formation, { DEF: number; MID: number; ATT: number }> = {
  '4-3-3': { DEF: 4, MID: 3, ATT: 3 },
  '4-4-2': { DEF: 4, MID: 4, ATT: 2 },
  '3-5-2': { DEF: 3, MID: 5, ATT: 2 },
};

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

  // Formation for the pitch / lineup view.
  readonly formationKeys = Object.keys(FORMATIONS) as Formation[];
  readonly formation = signal<Formation>('4-3-3');

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

  setFormation(f: Formation) {
    this.formation.set(f);
  }

  /** Pitch rows top→bottom (ATT, MID, DEF, GK); empty slots are null. */
  pitchRows(teamId: string): (SquadEntry | null)[][] {
    const f = FORMATIONS[this.formation()];
    const fill = (pos: Position, n: number): (SquadEntry | null)[] => {
      const arr: (SquadEntry | null)[] = this.squadByPosition(teamId, pos).slice(0, n);
      while (arr.length < n) arr.push(null);
      return arr;
    };
    return [fill('ATT', f.ATT), fill('MID', f.MID), fill('DEF', f.DEF), fill('GK', 1)];
  }

  /** Players not in the starting XI for the chosen formation. */
  benchOf(teamId: string): SquadEntry[] {
    const f = FORMATIONS[this.formation()];
    const counts: Record<Position, number> = { GK: 1, DEF: f.DEF, MID: f.MID, ATT: f.ATT };
    const bench: SquadEntry[] = [];
    for (const pos of this.positions) bench.push(...this.squadByPosition(teamId, pos).slice(counts[pos]));
    return bench;
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
