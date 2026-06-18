import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuctionService } from './auction.service';
import { POSITION_LABEL, type Position } from './players';
import { isFirebaseConfigured } from '../firebase-config';

const STORE_KEY = 'football-auction';
const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'ATT'];

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
    const all: { name: string; club: string; price: number; team: string }[] = [];
    for (const t of Object.values(r.teams ?? {})) {
      for (const e of Object.values(r.squads?.[t.id] ?? {})) {
        all.push({ name: e.name, club: e.club, price: e.price, team: t.name });
      }
    }
    return all.sort((a, b) => b.price - a.price).slice(0, 6);
  });

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
