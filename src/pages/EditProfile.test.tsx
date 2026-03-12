import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import EditProfile from './EditProfile';

// Mock UI & hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useProfiles', () => ({
  useUpdateProfile: vi.fn(),
}));

vi.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: vi.fn(() => ({
    upload: vi.fn(),
    isUploading: false,
  })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useProfiles';
import { useFileUpload } from '@/hooks/useFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

describe('EditProfile Component', () => {
  const mockUser = { id: 'user1', email: 'test@example.com' };
  const mockProfile = { username: 'testuser', display_name: 'Test O. User', avatar_url: '' };
  const mockUpdateProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      signOut: vi.fn(),
    } as any);

    vi.mocked(useUpdateProfile).mockReturnValue({
      mutateAsync: mockUpdateProfile,
      isPending: false,
    } as any);
  });

  const renderComponent = () => render(
    <MemoryRouter>
      <EditProfile />
    </MemoryRouter>
  );

  it('renders correctly with default profile data', () => {
    renderComponent();
    expect(screen.getByDisplayValue('Test O. User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('allows updating profile details (display name and username)', async () => {
    renderComponent();
    const user = userEvent.setup();

    const nameInput = screen.getByLabelText('Görünen Ad');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');

    const usernameInput = screen.getByLabelText('Kullanıcı Adı');
    await user.clear(usernameInput);
    await user.type(usernameInput, 'newusername');

    mockUpdateProfile.mockResolvedValueOnce({});

    await user.click(screen.getByRole('button', { name: 'Profili Kaydet' }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        user_id: 'user1',
        display_name: 'New Name',
        username: 'newusername',
        avatar_url: '',
      });
      expect(toast.success).toHaveBeenCalledWith('Profil güncellendi!');
    });
  });

  it('can upload a new avatar file when saving', async () => {
    const mockUpload = vi.fn().mockResolvedValueOnce('https://storage/avatar.png');
    vi.mocked(useFileUpload).mockReturnValue({
      upload: mockUpload,
      isUploading: false,
    } as any);

    renderComponent();
    const user = userEvent.setup();
    
    // Create a dummy file
    const fakeFile = new File(['hello'], 'avatar.png', { type: 'image/png' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, fakeFile);

    mockUpdateProfile.mockResolvedValueOnce({});

    await user.click(screen.getByRole('button', { name: 'Profili Kaydet' }));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith('covers', fakeFile, 'avatars/user1');
      expect(mockUpdateProfile).toHaveBeenCalledWith({
         user_id: 'user1',
         display_name: 'Test O. User',
         username: 'testuser',
         avatar_url: 'https://storage/avatar.png',
      });
      expect(toast.success).toHaveBeenCalledWith('Profil güncellendi!');
    });
  });

  it('prevents saving short passwords and mismatching passwords', async () => {
    renderComponent();
    const user = userEvent.setup();

    const newPwdInput = screen.getByLabelText('Yeni Şifre');
    const confirmPwdInput = screen.getByLabelText('Şifreyi Onayla');

    // Too short
    await user.type(newPwdInput, '123');
    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }));
    expect(toast.error).toHaveBeenCalledWith('Şifre en az 6 karakter olmalı');
    
    // Mismatch
    await user.clear(newPwdInput);
    await user.type(newPwdInput, 'securepass123');
    await user.type(confirmPwdInput, 'securepass321');
    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }));
    expect(toast.error).toHaveBeenCalledWith('Şifreler eşleşmiyor');
  });

  it('successfully updates the password via supabase.auth', async () => {
    renderComponent();
    const user = userEvent.setup();

    const newPwdInput = screen.getByLabelText('Yeni Şifre');
    const confirmPwdInput = screen.getByLabelText('Şifreyi Onayla');

    await user.type(newPwdInput, 'securepass123');
    await user.type(confirmPwdInput, 'securepass123');

    // mock supabase auth response
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({ data: { user: mockUser as any }, error: null });

    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'securepass123' });
      expect(toast.success).toHaveBeenCalledWith('Şifre güncellendi!');
    });
  });
});
