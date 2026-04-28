import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
	try {
		// Get token from GitHub CLI
		const { stdout } = await execAsync('gh auth token', { timeout: 10000 });
		const token = stdout.trim();
		
		if (!token) {
			return json(
				{ message: 'No token found. Please run `gh auth login` first.' },
				{ status: 401 }
			);
		}
		
		return json({ token });
	} catch (error) {
		console.error('GitHub CLI token error:', error);
		
		// Check if it's an authentication error
		if (error instanceof Error && error.message.includes('not logged in')) {
			return json(
				{ message: 'Not authenticated with GitHub CLI. Please run `gh auth login` first.' },
				{ status: 401 }
			);
		}
		
		return json(
			{ message: 'Failed to get token from GitHub CLI. Please ensure you are authenticated with `gh auth login`.' },
			{ status: 500 }
		);
	}
}
