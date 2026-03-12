import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GroupGate from './GroupGate';
import { supabase } from '@/integrations/supabase/client';

// Keep the same implementation but wrap specific modules 
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Local module mock for supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

describe('GroupGate', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123' },
      profile: { group_code: null },
    } as any);

    // Mock window.location for reload
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' } as unknown as Location & string;
  });

  afterEach(() => {
    window.location = originalLocation as unknown as Location & string;
  });

  const renderComponent = () => render(
    <MemoryRouter>
      <GroupGate />
    </MemoryRouter>
  );

  it('renders correctly', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /gruba katıl/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Davet kodunu girin')).toBeInTheDocument();
  });



  it('handles invalid or expired invite code', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { valid: false, group_code: null, code_id: null },
      error: null,
    } as any);

    renderComponent();
    
    const input = screen.getByPlaceholderText('Davet kodunu girin');
    fireEvent.change(input, { target: { value: 'INVALID' } });
    fireEvent.click(screen.getByRole('button', { name: /gruba katıl/i }));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('validate_invite_code', { code: 'INVALID' });
      expect(toast.error).toHaveBeenCalledWith('Geçersiz veya süresi dolmuş davet kodu');
    });
  });

  it('handles successful join', async () => {
    // 1. validate_invite_code
    // 2. increment_invite_code_use
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({
        data: { valid: true, group_code: 'NEWGROUP', code_id: 'code123' },
        error: null,
      } as any)
      .mockResolvedValueOnce({ data: null, error: null } as any);

    // Mock update
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

    renderComponent();
    
    const input = screen.getByPlaceholderText('Davet kodunu girin');
    fireEvent.change(input, { target: { value: 'VALID' } });
    fireEvent.click(screen.getByRole('button', { name: /gruba katıl/i }));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'validate_invite_code', { code: 'VALID' });
      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'increment_invite_code_use', { code_id: 'code123' });
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(toast.success).toHaveBeenCalledWith('Gruba başarıyla katıldınız!');
      expect(window.location.href).toBe('/');
    });
  });
});
