const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function fetchHealth() {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error('Failed to fetch health status');
  }
  return response.json();
}

export async function fetchData() {
  const response = await fetch(`${API_URL}/data`);
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  return response.json();
}

