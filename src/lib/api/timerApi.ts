import { apiFetch } from './client';

export type TaskStatus = 'Pending' | 'In Progress' | 'On Hold' | 'Completed' | 'active' | 'paused' | 'completed';

export interface TimerDTO {
	id: number | string;
	client: string;
	project: string;
	task: string;
	status: TaskStatus;
	start_time: string;
	duration_seconds: number;
}

export const timerApi = {
	getActive: () => 
		apiFetch<{ timer: TimerDTO | null }>('/timer/active'),

	getSessions: (limit = 20) => 
		apiFetch<{ sessions: TimerDTO[] }>(`/timer/sessions?limit=${limit}`),

	start: (client: string, project: string, task: string, deviceInfo: object) => 
		apiFetch<{ timer: TimerDTO }>('/timer/start', {
			method: 'POST',
			body: JSON.stringify({ client, project, task, device_info: deviceInfo })
		}),

	pause: (id: string | number, deviceInfo: object) => 
		apiFetch<{ timer: TimerDTO }>(`/timer/${id}/pause`, {
			method: 'POST',
			body: JSON.stringify({ device_info: deviceInfo })
		}),

	resume: (id: string | number, deviceInfo: object) => 
		apiFetch<{ timer: TimerDTO }>(`/timer/${id}/resume`, {
			method: 'POST',
			body: JSON.stringify({ device_info: deviceInfo })
		}),

	complete: (id: string | number, deviceInfo: object) => 
		apiFetch<{ timer: TimerDTO }>(`/timer/${id}/complete`, {
			method: 'POST',
			body: JSON.stringify({ device_info: deviceInfo })
		}),

	discard: (id: string | number, deviceInfo: object) => 
		apiFetch<void>(`/timer/${id}`, {
			method: 'DELETE',
			body: JSON.stringify({ device_info: deviceInfo })
		})
};
