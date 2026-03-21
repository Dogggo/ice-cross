import { Routes } from '@angular/router';
import { Dashboard } from './containers/dashboard/dashboard';
import { Events } from './containers/events/events';
import { Login } from './containers/login/login';
import { Tournament } from './containers/tournament/tournament';
import { StartingList } from './containers/starting-list/starting-list';
import { TimedEliminations } from './containers/timed-eliminations/timed-eliminations';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
	{
		path: 'login',
		component: Login,
		canActivate: [noAuthGuard],
	},
	{
		path: '',
		component: Dashboard,
		canActivate: [authGuard],
	},
	{
		path: 'event/:id',
		component: Events,
		canActivate: [authGuard],
	},
	{
		path: 'event/:id/starting-list',
		component: StartingList,
		canActivate: [authGuard],
	},
	{
		path: 'event/:id/timed-eliminations/:categoryId',
		component: TimedEliminations,
		canActivate: [authGuard],
	},
	{
		path: 'event/:id/tournament/:tournamentId',
		component: Tournament,
		canActivate: [authGuard],
	},
];
