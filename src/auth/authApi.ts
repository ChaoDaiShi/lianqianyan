import { AxiosError } from 'axios';
import { api } from '@/lib/api';

export interface AuthAccount {
  id: string;
  username: string;
  displayName: string;
  selectedCourseId: string | null;
  createdAt: string;
}

interface AccountWire {
  id: string;
  username: string;
  display_name: string;
  selected_course_id: string | null;
  created_at: string;
}

interface SessionWire { account: AccountWire }

export interface CourseOption {
  id: string;
  name: string;
  description: string | null;
}

function mapAccount(account: AccountWire): AuthAccount {
  return {
    id: account.id,
    username: account.username,
    displayName: account.display_name,
    selectedCourseId: account.selected_course_id,
    createdAt: account.created_at,
  };
}

export async function registerAccount(payload: {
  username: string;
  displayName: string;
  password: string;
  captchaToken?: string | null;
}): Promise<AuthAccount> {
  const response = await api.post<SessionWire>('/api/auth/register', {
    username: payload.username,
    display_name: payload.displayName,
    password: payload.password,
    captcha_token: payload.captchaToken || null,
  });
  return mapAccount(response.data.account);
}

export async function loginAccount(username: string, password: string, captchaToken?: string | null): Promise<AuthAccount> {
  const response = await api.post<SessionWire>('/api/auth/login', { username, password, captcha_token: captchaToken || null });
  return mapAccount(response.data.account);
}

export interface PublicRuntimeConfig {
  turnstile_enabled: boolean;
  turnstile_site_key: string | null;
}

export async function fetchPublicRuntimeConfig(): Promise<PublicRuntimeConfig> {
  return (await api.get<PublicRuntimeConfig>('/api/public/config')).data;
}

export async function restoreSession(): Promise<AuthAccount | null> {
  try {
    const response = await api.get<SessionWire>('/api/auth/session');
    return mapAccount(response.data.account);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) return null;
    throw error;
  }
}

export async function logoutAccount(): Promise<void> {
  await api.post('/api/auth/logout');
}

export async function listCourses(): Promise<CourseOption[]> {
  const response = await api.get<Array<{ id: string; name: string; description: string | null }>>('/api/auth/courses');
  return response.data;
}

export async function selectAccountCourse(courseId: string): Promise<AuthAccount> {
  const response = await api.put<AccountWire>('/api/auth/course', { course_id: courseId });
  return mapAccount(response.data);
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    if (error.response?.status === 409) return '这个用户名已经被使用，请换一个。';
    if (error.response?.status === 423) return '登录尝试过多，账号已暂时锁定 15 分钟。';
    if (error.response?.status === 401) return '用户名或密码不正确。';
    if (error.response?.status === 400 && typeof detail === 'string') return `人机验证失败：${detail}`;
    if (typeof detail === 'string') return detail;
  }
  return '服务暂时不可用，请稍后重试。';
}
