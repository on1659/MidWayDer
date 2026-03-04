import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard } from '../clipboard';

describe('copyToClipboard', () => {
  beforeEach(() => vi.restoreAllMocks());

  // T1: Modern API 경로
  it('navigator.clipboard.writeText 성공 → true 반환', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    const result = await copyToClipboard('테스트 텍스트');
    expect(result).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('테스트 텍스트');
  });

  // T2: Modern API 실패 → false
  it('navigator.clipboard.writeText 예외 → false 반환', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
    });
    const result = await copyToClipboard('텍스트');
    expect(result).toBe(false);
  });

  // T3: Fallback (execCommand)
  it('navigator.clipboard 없을 때 execCommand fallback 사용', async () => {
    vi.stubGlobal('navigator', {}); // clipboard 없음
    const mockExecCommand = vi.fn().mockReturnValue(true);
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue({
        value: '', style: {}, focus: vi.fn(), select: vi.fn(),
      }),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
      execCommand: mockExecCommand,
    });
    const result = await copyToClipboard('fallback 텍스트');
    expect(result).toBe(true);
  });

  // T4: Fallback execCommand 실패 → false
  it('execCommand 예외 → false 반환 (크래시 없음)', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue({
        value: '', style: {}, focus: vi.fn(), select: vi.fn(),
      }),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
      execCommand: vi.fn().mockImplementation(() => { throw new Error('not supported'); }),
    });
    const result = await copyToClipboard('텍스트');
    expect(result).toBe(false);
  });
});
