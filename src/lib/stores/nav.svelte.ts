/**
 * Module-level navigation store.
 * Stored at module scope so it survives component remounts.
 */

const TAB_KEY = 'worktrack_active_tab';

function getInitialTab(): string {
	if (typeof localStorage !== 'undefined') {
		return localStorage.getItem(TAB_KEY) || 'home';
	}
	return 'home';
}

let _activeTab = $state(getInitialTab());

export const navStore = {
	get activeTab(): string {
		return _activeTab;
	},
	setTab(tab: string) {
		_activeTab = tab;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(TAB_KEY, tab);
		}
	}
};
