import { v4 as uuidv4 } from 'uuid';

export function generateNickname() {
	return `User ${uuidv4()}`;
}