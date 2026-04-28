import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
	try {
		// Check if GitHub CLI is available
		await execAsync('gh --version', { timeout: 5000 });
		
		return json({ available: true });
	} catch (error) {
		return json({ available: false });
	}
}
