import { Routes } from '@angular/router';
import { Auction } from './auction/auction';
import { Login } from './login/login';

export const routes: Routes = [
  { path: '', redirectTo: 'auction', pathMatch: 'full' },
  { path: 'auction', component: Auction },
  { path: 'login', component: Login },
];
