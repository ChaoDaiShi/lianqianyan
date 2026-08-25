import { describe, expect, it } from 'vitest';
import { resolveRuntimeConfig } from './runtime';

describe('resolveRuntimeConfig', () => {
  it('prefers valid host context and trims the API trailing slash', () => {
    expect(
      resolveRuntimeConfig({
        host: {
          learnerId: 'platform:user-42',
          courseId: 'course-os',
          apiBaseUrl: 'https://api.example.com/',
        },
        envApiBaseUrl: 'https://env.example.com',
      }),
    ).toEqual({
      hostLearnerId: 'platform:user-42',
      courseId: 'course-os',
      apiBaseUrl: 'https://api.example.com',
    });
  });

  it('uses a valid environment API URL when the host does not provide one', () => {
    expect(
      resolveRuntimeConfig({
        host: undefined,
        envApiBaseUrl: 'https://env.example.com/api/',
      }).apiBaseUrl,
    ).toBe('https://env.example.com/api');
  });

  it('rejects unsafe identifiers and URL protocols', () => {
    expect(
      resolveRuntimeConfig({
        host: {
          learnerId: 'person@example.com',
          courseId: '../other-course',
          apiBaseUrl: 'javascript:alert(1)',
        },
        envApiBaseUrl: 'file:///tmp/education-api',
      }),
    ).toEqual({
      hostLearnerId: null,
      courseId: 'course-os',
      apiBaseUrl: '',
    });
  });

  it('allows a same-origin relative API base path', () => {
    expect(
      resolveRuntimeConfig({
        host: { apiBaseUrl: '/education-api/' },
        envApiBaseUrl: '',
      }).apiBaseUrl,
    ).toBe('/education-api');
  });
});
