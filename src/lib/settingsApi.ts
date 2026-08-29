import { api } from '@/lib/api';
import type { ThemePreference } from '@/theme/ThemeProvider';

export type ModelKind = 'llm' | 'tts';
export type ModelProvider = 'openai_chat' | 'openai_speech' | 'gpt_sovits';

export interface ModelProfile {
  id: string;
  name: string;
  kind: ModelKind;
  provider: ModelProvider;
  base_url: string;
  model: string | null;
  voice: string | null;
  has_api_key: boolean;
  created_at: string;
}

export interface AccountSettings {
  theme: ThemePreference;
  selected_llm_profile_id: string | null;
  selected_tts_profile_id: string | null;
  profiles: ModelProfile[];
  default_llm: { configured: boolean; provider: string; model: string | null };
  default_tts: { configured: boolean; provider: string; model: string | null };
  custom_model_hosts: string[];
  secret_storage_configured: boolean;
}

export interface MCPToken {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export async function fetchAccountSettings(): Promise<AccountSettings> {
  return (await api.get<AccountSettings>('/api/settings')).data;
}

export async function updateAccountTheme(theme: ThemePreference): Promise<AccountSettings> {
  return (await api.put<AccountSettings>('/api/settings/theme', { theme })).data;
}

export async function createModelProfile(payload: {
  name: string;
  kind: ModelKind;
  provider: ModelProvider;
  base_url: string;
  model?: string;
  voice?: string;
  api_key?: string;
}): Promise<ModelProfile> {
  return (await api.post<ModelProfile>('/api/settings/models', payload)).data;
}

export async function selectModelProfile(kind: ModelKind, profileId: string | null): Promise<AccountSettings> {
  return (await api.put<AccountSettings>(`/api/settings/models/${kind}/selection`, { profile_id: profileId })).data;
}

export async function deleteModelProfile(profileId: string): Promise<void> {
  await api.delete(`/api/settings/models/${profileId}`);
}

export async function listMcpTokens(): Promise<MCPToken[]> {
  return (await api.get<MCPToken[]>('/api/settings/mcp-tokens')).data;
}

export async function createMcpToken(name: string): Promise<MCPToken & { token: string }> {
  return (await api.post<MCPToken & { token: string }>('/api/settings/mcp-tokens', { name })).data;
}

export async function revokeMcpToken(id: string): Promise<void> {
  await api.delete(`/api/settings/mcp-tokens/${id}`);
}
